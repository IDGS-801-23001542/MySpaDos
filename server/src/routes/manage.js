import { Router } from 'express';
import { z } from 'zod';
import { col, nextId, inTransaction } from '../lib/db.js';
import { assert, HttpError, idParam, publicRecord, route, searchRegex, validate } from '../lib/http.js';
import { requireEmployee, requireAdmin, createAccount, hashPassword, revokeUserSessions } from '../lib/security.js';
import { employeeSchema, clientSchema, productSchema, branchSchema, roomSchema, scheduleSchema, treatmentSchema } from '../lib/validation.js';
import { generateEmployeeNumber, generateClientNumber } from '../lib/numbers.js';
import { ensureAccountAvailable } from '../lib/accountConflicts.js';
import { phoneKey, duplicateFieldMessage } from '../lib/accountFields.js';
import { catalogStatusFilter, catalogSort } from '../lib/catalogListing.js';

const router = Router();
router.use(requireEmployee);

const schemas = {
  employees: employeeSchema,
  clients: clientSchema,
  products: productSchema,
  branches: branchSchema,
  rooms: roomSchema,
  schedules: scheduleSchema,
  treatments: treatmentSchema,
};

const searchable = {
  employees: ['name', 'lastName', 'secondLastName', 'rfc', 'position', 'employeeNumber', 'username', 'email', 'phone', 'address', 'gender', 'status', 'photoUrl'],
  clients: ['name', 'lastName', 'secondLastName', 'rfc', 'clientNumber', 'username', 'email', 'phone', 'address', 'gender', 'status'],
  products: ['name', 'brand', 'status'],
  branches: ['name', 'address', 'stateName', 'municipality', 'postalCode', 'status'],
  rooms: ['name', 'description', 'photoUrl', 'status'],
  schedules: ['start', 'end'],
  treatments: ['name', 'description', 'status'],
};

function collectionFor(name) {
  assert(schemas[name], 404, 'Módulo desconocido');
  return col(name);
}

async function checkRelations(resource, item, editingId = null) {
  if (resource === 'treatments' && item.status === 'ACTIVO') {
    const ids = item.defaultProducts.map((product) => product.productId);
    assert(new Set(ids).size === ids.length, 422, 'No repitas un producto en el tratamiento predeterminado');
    for (const entry of item.defaultProducts) {
      assert(await col('products').findOne({ id: entry.productId, status: 'ACTIVO' }),
        422, 'El tratamiento incluye un producto inexistente o inactivo');
    }
  }
  if (resource === 'schedules') {
    const existing = await col('schedules').find({}).toArray();
    assert(!existing.some((slot) => slot.id !== editingId && item.start < slot.end && item.end > slot.start),
      409, 'El horario se superpone con otro ya registrado');
  }
  if (resource === 'employees' || resource === 'rooms') {
    assert(await col('branches').findOne({ id: item.branchId, status: 'ACTIVO' }), 422, 'Selecciona una sucursal activa');
  }
  if (resource === 'rooms' && editingId !== null) {
    const couples = await col('reservations').countDocuments({
      roomId: editingId,
      status: 'PENDIENTE',
      startAt: { $gt: new Date() },
      partySize: { $gt: item.capacity },
    });
    assert(couples === 0, 409,
      'No puedes reducir la capacidad: esta sala tiene reservaciones futuras para más personas');
  }
}

async function protectDeactivate(resource, existing) {
  if (resource === 'branches') {
    assert(!(await col('rooms').countDocuments({ branchId: existing.id, status: 'ACTIVO' })),
      409, 'Primero desactiva las salas de esta sucursal');
  }
  if (resource === 'products') {
    assert(!(await col('treatments').countDocuments({
      status: 'ACTIVO', 'defaultProducts.productId': existing.id,
    })), 409, 'Quita primero el producto de los tratamientos predeterminados activos');
  }
  if (resource === 'rooms') {
    assert(!(await col('reservations').countDocuments({ roomId: existing.id, status: 'PENDIENTE', startAt: { $gt: new Date() } })),
      409, 'La sala tiene reservaciones próximas');
  }
}

router.get('/:resource', route(async (req, res) => {
  const collection = collectionFor(req.params.resource);
  const regex = searchRegex(req.query.q);
  const filter = catalogStatusFilter(req.params.resource, req.query.status);
  if (regex) {
    filter.$or = searchable[req.params.resource].map((key) => ({ [key]: regex }));
    if (req.params.resource === 'products' && Number.isFinite(Number(req.query.q))) {
      filter.$or.push({ usePrice: Number(req.query.q) });
    }
    if (req.params.resource === 'branches' && Number.isFinite(Number(req.query.q))) {
      filter.$or.push({ latitude: Number(req.query.q) }, { longitude: Number(req.query.q) });
    }
  }
  const items = await collection.find(filter).sort(catalogSort(req.params.resource)).limit(500).toArray();
  const userRoles = req.params.resource === 'employees' && req.user.role === 'ADMIN'
    ? new Map((await col('users').find({ id: { $in: items.map((entry) => entry.userId) } })
      .project({ id: 1, role: 1 }).toArray()).map((user) => [user.id, user.role]))
    : new Map();
  const visible = items.map((item) => {
    if (req.user.role === 'ADMIN') return { ...publicRecord(item), ...(req.params.resource === 'employees' ? { accessRole: userRoles.get(item.userId) || 'EMPLEADO' } : {}) };
    if (req.params.resource === 'employees') {
      const { id, name, lastName, position, branchId, status } = item;
      return { id, name, lastName, position, branchId, status };
    }
    if (req.params.resource === 'clients') {
      const { id, name, lastName, clientNumber, status } = item;
      return { id, name, lastName, clientNumber, status };
    }
    if (req.params.resource === 'products') {
      return publicRecord(item);
    }
    return publicRecord(item);
  });
  res.json({ data: visible });
}));

router.get('/:resource/:id', route(async (req, res) => {
  assert(req.user.role === 'ADMIN', 403, 'Detalle administrativo restringido');
  const item = await collectionFor(req.params.resource).findOne({ id: idParam(req.params.id) });
  assert(item, 404, 'Registro no encontrado');
  res.json({ data: {
    ...publicRecord(item),
    ...(req.params.resource === 'employees' ? {
      accessRole: (await col('users').findOne({ id: item.userId }))?.role || 'EMPLEADO',
    } : {}),
  } });
}));

// Stock arrivals are additive, atomic, and separate from ordinary product edits.
router.post('/products/:id/restock', requireAdmin, route(async (req, res) => {
  const id = idParam(req.params.id);
  const { quantity } = validate(z.object({ quantity: z.number().int().min(1).max(1000000) }).strict(), req.body);
  const result = await inTransaction(async (session) => {
    const product = await col('products').findOne({ id, status: 'ACTIVO' }, { session });
    assert(product, 404, 'Producto activo no encontrado');
    const before = Number(product.stock || 0);
    assert(before + quantity <= 1000000, 422, 'Las existencias excederían el máximo permitido');
    const updated = await col('products').findOneAndUpdate(
      { id, stock: product.stock, status: 'ACTIVO' },
      { $inc: { stock: quantity }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after', session },
    );
    assert(updated, 409, 'El inventario cambió durante la operación. Vuelve a intentarlo.');
    await col('inventoryMovements').insertOne({
      id: await nextId('inventoryMovements', session),
      productId: id,
      type: 'ENTRADA',
      quantity,
      previousStock: before,
      newStock: before + quantity,
      actorUserId: req.user.id,
      createdAt: new Date(),
    }, { session });
    return updated;
  });
  res.json({ data: publicRecord(result) });
}));

router.post('/:resource', requireAdmin, route(async (req, res) => {
  const resource = req.params.resource;
  const input = validate(schemas[resource] || (() => { throw new HttpError(404, 'Módulo desconocido'); })(), req.body);
  if (resource === 'clients' || resource === 'employees') {
    await ensureAccountAvailable(resource === 'clients' ? input : { ...input, phone: '' });
  }
  await checkRelations(resource, input);
  let data;
  try {
    data = await inTransaction(async (session) => {
      const record = {
        ...input,
        ...(resource === 'clients' && phoneKey(input.phone) ? { phoneKey: phoneKey(input.phone) } : {}),
        id: await nextId(resource, session),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (resource === 'employees' || resource === 'clients') {
        assert(input.password, 422, 'Necesitas una contraseña para la cuenta nueva');
        record.userId = await createAccount({
          ...input,
          role: resource === 'employees' ? input.accessRole : 'CLIENTE',
          session,
        });
        if (resource === 'employees') {
          record.employeeNumber = await generateEmployeeNumber(input.rfc, session);
        } else {
          record.clientNumber = await generateClientNumber(input, session);
        }
        delete record.password;
        if (resource === 'employees') delete record.accessRole;
      }
      await col(resource).insertOne(record, { session });
      return record;
    });
  } catch (error) {
    const message = duplicateFieldMessage(error);
    if (message) throw new HttpError(409, message);
    throw error;
  }
  res.status(201).json({ data: publicRecord(data) });
}));

router.patch('/:resource/:id', requireAdmin, route(async (req, res) => {
  const resource = req.params.resource;
  const collection = collectionFor(resource);
  const id = idParam(req.params.id);
  const existing = await collection.findOne({ id });
  assert(existing, 404, 'Registro no encontrado');

  const input = validate(schemas[resource], req.body);
  if (resource === 'clients' || resource === 'employees') {
    await ensureAccountAvailable(resource === 'clients' ? input : { ...input, phone: '' }, {
      excludeUserId: existing.userId,
      excludeClientId: resource === 'clients' ? existing.id : undefined,
    });
  }
  await checkRelations(resource, input, id);
  if (resource === 'schedules') {
    assert(!(await col('reservations').countDocuments({ scheduleId: id })),
      409, 'No se puede modificar un horario ya utilizado en reservaciones');
  }
  if (existing.status === 'ACTIVO' && input.status === 'INACTIVO') {
    await protectDeactivate(resource, existing);
  }

  if (resource === 'employees' || resource === 'clients') {
    if (resource === 'employees' && req.user.id === existing.userId && input.accessRole !== 'ADMIN') {
      throw new HttpError(409, 'No puedes retirar tu propio rol administrador');
    }
    if (resource === 'employees' && req.user.id === existing.userId && input.status === 'INACTIVO') {
      throw new HttpError(409, 'No puedes desactivar tu propia cuenta');
    }
    const currentUser = await col('users').findOne({ id: existing.userId });
    const userUpdate = {
      username: input.username,
      usernameLower: input.username.toLowerCase(),
      emailLower: input.email.toLowerCase(),
      status: input.status,
      ...(resource === 'employees' ? { role: input.accessRole } : {}),
    };
    if (input.password) userUpdate.passwordHash = await hashPassword(input.password);
    try {
      await inTransaction(async (session) => {
        await col('users').updateOne({ id: existing.userId }, { $set: userUpdate }, { session });
        const { password, accessRole, ...changes } = input;
        const normalizedPhone = resource === 'clients' ? phoneKey(changes.phone) : '';
        const update = { $set: {
          ...changes,
          ...(normalizedPhone ? { phoneKey: normalizedPhone } : {}),
          updatedAt: new Date(),
        } };
        if (resource === 'clients' && !normalizedPhone) {
          update.$unset = { phoneKey: '' };
        }
        await collection.updateOne({ id }, update, { session });
        if (input.password || input.status === 'INACTIVO' || (resource === 'employees' && currentUser?.role !== input.accessRole)) {
          await revokeUserSessions(existing.userId, session);
        }
      });
    } catch (error) {
      const message = duplicateFieldMessage(error);
      if (message) throw new HttpError(409, message);
      throw error;
    }
  } else {
    // A product edit may change its description and price, never overwrite stock.
    // Stock is increased only through /products/:id/restock or consumed by services.
    const { stock: ignoredStock, ...changes } = input;
    const patch = resource === 'products' ? changes : input;
    await collection.updateOne({ id }, { $set: { ...patch, updatedAt: new Date() } });
  }
  res.json({ data: publicRecord(await collection.findOne({ id })) });
}));

router.delete('/:resource/:id', requireAdmin, route(async (req, res) => {
  const resource = req.params.resource;
  const collection = collectionFor(resource);
  const id = idParam(req.params.id);
  const record = await collection.findOne({ id });
  assert(record, 404, 'Registro no encontrado');

  if (resource === 'schedules') {
    assert(!(await col('reservations').countDocuments({ scheduleId: id })),
      409, 'No se puede eliminar un horario utilizado en reservaciones');
    await collection.deleteOne({ id });
    return res.json({ message: 'Horario eliminado permanentemente' });
  }

  if (resource === 'employees' && record.userId === req.user.id) {
    throw new HttpError(409, 'No puedes desactivar tu propia cuenta');
  }
  await protectDeactivate(resource, record);
  await inTransaction(async (session) => {
    await collection.updateOne(
      { id },
      { $set: { status: 'INACTIVO', updatedAt: new Date() } },
      { session },
    );
    if (record.userId) {
      await col('users').updateOne(
        { id: record.userId },
        { $set: { status: 'INACTIVO' } },
        { session },
      );
      await revokeUserSessions(record.userId, session);
    }
  });
  res.json({ message: 'Registro desactivado (baja lógica)' });
}));

export default router;
