import { Router } from 'express';
import { z } from 'zod';
import { col, nextId, inTransaction } from '../lib/db.js';
import { assert, HttpError, idParam, publicRecord, route, validate } from '../lib/http.js';
import { requireUser, assertSameBranch, isStaff } from '../lib/security.js';
import { productCost, sumCosts } from '../lib/costs.js';
import { inventoryDeltas } from '../lib/inventory.js';
import { reconcileExpiredReservations } from '../lib/attendance.js';
import { servicePersonnel } from '../lib/servicePersonnel.js';
import { serviceHistoryFilter, serviceHistoryPage } from '../lib/serviceHistory.js';

const router = Router();
router.use(requireUser);

const detailSchema = z.object({
  treatmentId: z.coerce.number().int().positive(),
  guestIndex: z.coerce.number().int().min(0).max(1).default(0),
  products: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(500),
  })).min(1),
});
const serviceSchema = z.object({
  reservationId: z.coerce.number().int().positive(),
  employeeId: z.coerce.number().int().positive(),
  dateTime: z.string().datetime({ offset: true }),
  treatments: z.array(detailSchema).min(1),
});

async function employeeProfile(req) {
  return col('employees').findOne({ userId: req.user.id, status: 'ACTIVO' });
}

async function adjustInventory(nextLines, oldLines, session) {
  for (const [id, delta] of inventoryDeltas(nextLines, oldLines)) {
    const product = await col('products').findOne({ id }, { session });
    assert(product, 422, 'Uno de los productos utilizados ya no existe');
    if (product.trackStock === false) continue;
    const query = { id, ...(delta < 0 ? { stock: { $gte: -delta } } : {}) };
    const result = await col('products').updateOne(query, { $inc: { stock: delta } }, { session });
    assert(result.modifiedCount === 1, 409,
      `Inventario insuficiente para el producto #${id}. Revisa las existencias.`);
  }
}

async function assembleService(input, booking) {
  const employee = await col('employees').findOne({ id: input.employeeId, status: 'ACTIVO' });
  assert(employee?.branchId === booking.branchId, 422, 'El empleado debe pertenecer a la sucursal');

  const guests = booking.guests?.length ? booking.guests : [{
    name: booking.clientName || 'Titular de la reservación',
    treatmentIds: [],
  }];
  const lines = [];
  for (const line of input.treatments) {
    assert(line.guestIndex < (booking.partySize || 1), 422,
      'El tratamiento no corresponde a un asistente de la reservación');
    const treatment = await col('treatments').findOne({ id: line.treatmentId, status: 'ACTIVO' });
    assert(treatment, 422, 'Selecciona un tratamiento activo');
    const products = [];
    for (const entry of line.products) {
      const product = await col('products').findOne({ id: entry.productId, status: 'ACTIVO' });
      assert(product, 422, 'Selecciona productos activos');
      const useCost = productCost(product.usePrice, entry.quantity);
      products.push({ productId: product.id, name: product.name, brand: product.brand,
        quantity: entry.quantity, unitCost: product.usePrice, totalCost: useCost });
    }
    lines.push({ guestIndex: line.guestIndex, guestName: guests[line.guestIndex]?.name || 'Asistente',
      treatmentId: treatment.id, name: treatment.name, description: treatment.description,
      products, totalCost: sumCosts(products.map((product) => product.totalCost)) });
  }
  return {
    employeeId: employee.id, employeeName: `${employee.name} ${employee.lastName}`,
    guests, partySize: booking.partySize || 1,
    dateTime: new Date(input.dateTime), treatments: lines,
    totalCost: sumCosts(lines.map((line) => line.totalCost)),
  };
}

router.get('/', route(async (req, res) => {
  const filter = {};
  if (req.user.role === 'CLIENTE') {
    const client = await col('clients').findOne({ userId: req.user.id });
    assert(client, 403, 'Cuenta de cliente inválida');
    filter.clientId = client.id;
  } else {
    const employee = await employeeProfile(req);
    assert(employee, 403, 'Empleado inválido');
    if (req.user.role !== 'ADMIN') filter.branchId = employee.branchId;
  }
  const records = await col('services').find(filter).sort({ dateTime: -1 }).limit(300).toArray();
  res.json({ data: records.map(publicRecord) });
}));

// Paginated, staff-only history: no global 300-record cap.
router.get('/history', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Acceso exclusivo para personal');
  const employee = await employeeProfile(req);
  assert(employee, 403, 'Empleado inválido');
  const admin = req.user.role === 'ADMIN';
  if (!admin) assert(Number.isSafeInteger(employee.branchId), 403, 'Sucursal inválida');
  const filter = serviceHistoryFilter(admin ? {} : { branchId: employee.branchId }, req.query.q);
  const services = col('services');
  const total = await services.countDocuments(filter);
  const { page, pages, skip, pageSize } = serviceHistoryPage(req.query.page, total);
  const records = await services.find(filter).sort({ dateTime: -1, id: -1 }).skip(skip).limit(pageSize).toArray();
  const ids = [...new Set(records.map((record) => record.branchId).filter(Number.isSafeInteger))];
  const branches = ids.length ? await col('branches').find({ id: { $in: ids } }).project({ id: 1, name: 1 }).toArray() : [];
  const names = new Map(branches.map((branch) => [branch.id, branch.name]));
  res.json({ data: { items: records.map((record) => ({ ...publicRecord(record),
    branchName: names.get(record.branchId) || `Sucursal #${record.branchId}`,
  })), total, page, pages, pageSize } });
}));

// Resolve the appointment and eligible personnel from the same authoritative branch.
router.get('/reservation/:id', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Acceso exclusivo para personal');
  await reconcileExpiredReservations();
  const booking = await col('reservations').findOne({ id: idParam(req.params.id) });
  assert(booking, 404, 'Reservación no encontrada');
  assertSameBranch(await employeeProfile(req), booking.branchId, req.user);
  const [client, room, branch, schedule, employees] = await Promise.all([
    col('clients').findOne({ id: booking.clientId }),
    col('rooms').findOne({ id: booking.roomId }),
    col('branches').findOne({ id: booking.branchId }),
    col('schedules').findOne({ id: booking.scheduleId }),
    servicePersonnel(col('employees'), booking),
  ]);
  res.json({ data: {
    booking: { ...publicRecord(booking),
      clientName: client ? `${client.name} ${client.lastName}` : 'Cliente',
      roomName: room?.name || `Sala #${booking.roomId}`,
      branchName: branch?.name || `Sucursal #${booking.branchId}`,
      scheduleText: schedule ? `${schedule.start} – ${schedule.end}` : `${booking.start || '—'} – ${booking.end || '—'}`,
    }, employees,
  } });
}));

router.get('/:id', route(async (req, res) => {
  const service = await col('services').findOne({ id: idParam(req.params.id) });
  assert(service, 404, 'Servicio no encontrado');
  if (req.user.role === 'CLIENTE') {
    const client = await col('clients').findOne({ userId: req.user.id });
    assert(client?.id === service.clientId, 403, 'No puedes consultar servicios ajenos');
  } else assertSameBranch(await employeeProfile(req), service.branchId, req.user);
  res.json({ data: publicRecord(service) });
}));

router.post('/', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Solo los empleados registran servicios');
  const input = validate(serviceSchema, req.body);
  await reconcileExpiredReservations();
  const booking = await col('reservations').findOne({ id: input.reservationId });
  assert(booking, 404, 'Reservación no encontrada');
  assertSameBranch(await employeeProfile(req), booking.branchId, req.user);
  assert(booking.status === 'PENDIENTE', 409, 'La reservación no está pendiente');
  const detail = await assembleService(input, booking);
  const [client, room] = await Promise.all([
    col('clients').findOne({ id: booking.clientId }),
    col('rooms').findOne({ id: booking.roomId }),
  ]);
  const service = {
    id: await nextId('services'), reservationId: booking.id,
    clientId: booking.clientId, clientName: client ? `${client.name} ${client.lastName}` : 'Cliente',
    roomId: booking.roomId, roomName: room?.name || 'Sala', branchId: booking.branchId,
    ...detail, createdAt: new Date(), updatedAt: new Date(),
  };
  // Claim the reservation and insert its service in one Atlas transaction.
  // No other request can observe a completed reservation without its service.
  try {
    await inTransaction(async (session) => {
      const claim = await col('reservations').updateOne(
        { id: booking.id, status: 'PENDIENTE' },
        { $set: { status: 'ATENDIDA', updatedAt: new Date() } },
        { session },
      );
      assert(claim.modifiedCount === 1, 409, 'La reservación ya fue atendida o cancelada');
      await adjustInventory(service.treatments, [], session);
      await col('services').insertOne({ ...service, inventoryApplied: true }, { session });
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'La reservación ya tiene un servicio registrado');
    }
    throw error;
  }
  res.status(201).json({ data: publicRecord(service) });
}));

router.patch('/:id', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Solo los empleados modifican servicios');
  const id = idParam(req.params.id);
  const existing = await col('services').findOne({ id });
  assert(existing, 404, 'Servicio no encontrado');
  assertSameBranch(await employeeProfile(req), existing.branchId, req.user);
  const input = validate(serviceSchema, req.body);
  assert(input.reservationId === existing.reservationId, 422, 'No se puede cambiar la reservación del servicio');
  const detail = await assembleService(input, existing);
  await inTransaction(async (session) => {
    const previousLines = existing.inventoryApplied ? existing.treatments : [];
    await adjustInventory(detail.treatments, previousLines, session);
    const result = await col('services').updateOne(
      { id, updatedAt: existing.updatedAt },
      { $set: { ...detail, inventoryApplied: true, updatedAt: new Date() } },
      { session },
    );
    assert(result.modifiedCount === 1, 409, 'Otro usuario modificó el servicio. Recarga los datos.');
  });
  res.json({ data: publicRecord(await col('services').findOne({ id })) });
}));

router.delete('/:id', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Solo los empleados eliminan servicios');
  const id = idParam(req.params.id);
  const existing = await col('services').findOne({ id });
  assert(existing, 404, 'Servicio no encontrado');
  assertSameBranch(await employeeProfile(req), existing.branchId, req.user);
  await inTransaction(async (session) => {
    const result = await col('services').deleteOne({ id }, { session });
    assert(result.deletedCount === 1, 409, 'El servicio ya fue eliminado');
    if (existing.inventoryApplied) await adjustInventory([], existing.treatments, session);
  });
  // La reservación conserva su historial de atención aunque se elimine el servicio.
  res.json({ message: 'Servicio eliminado físicamente' });
}));

export default router;
