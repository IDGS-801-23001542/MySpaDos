import { spaInstant, validCalendarDate } from '../lib/time.js';
import { Router } from 'express';
import { z } from 'zod';
import { col, nextId } from '../lib/db.js';
import { assert, HttpError, idParam, publicRecord, route, searchRegex, validate } from '../lib/http.js';
import { requireUser, assertSameBranch, isStaff } from '../lib/security.js';
import { notifyBooking } from '../lib/mailer.js';

const router = Router();
router.use(requireUser);

const guestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(25).default(''),
  treatmentIds: z.array(z.coerce.number().int().positive()).max(8).default([]),
}).strict();

const bookingSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  roomId: z.coerce.number().int().positive(),
  scheduleId: z.coerce.number().int().positive(),
  partySize: z.coerce.number().int().min(1).max(2).default(1),
  date: z.string().refine(validCalendarDate, 'La fecha no existe en el calendario'),
  guests: z.array(guestSchema).min(1).max(2).optional(),
});

async function employeeProfile(req) {
  return isStaff(req.user) ? col('employees').findOne({ userId: req.user.id, status: 'ACTIVO' }) : null;
}

async function clientProfile(req) {
  return col('clients').findOne({ userId: req.user.id, status: 'ACTIVO' });
}

async function normalizedGuests(input, client) {
  const guests = input.guests || [{
    name: `${client.name} ${client.lastName}`.trim(),
    phone: client.phone || '', treatmentIds: [],
  }];
  assert(guests.length === input.partySize, 422,
    'Indica los datos de cada persona según la capacidad reservada');
  const requested = [...new Set(guests.flatMap((guest) => guest.treatmentIds))];
  for (const guest of guests) {
    assert(new Set(guest.treatmentIds).size === guest.treatmentIds.length, 422,
      'No repitas tratamientos para una misma persona');
  }
  if (requested.length) {
    const count = await col('treatments').countDocuments({ id: { $in: requested }, status: 'ACTIVO' });
    assert(count === requested.length, 422, 'Hay tratamientos seleccionados que ya no están disponibles');
  }
  return guests;
}

async function bookingDetails(booking) {
  const [client, room, branch, schedule] = await Promise.all([
    col('clients').findOne({ id: booking.clientId }),
    col('rooms').findOne({ id: booking.roomId }),
    col('branches').findOne({ id: booking.branchId }),
    col('schedules').findOne({ id: booking.scheduleId }),
  ]);
  return {
    ...publicRecord(booking),
    clientName: client ? `${client.name} ${client.lastName}` : 'Cliente',
    roomName: room?.name || 'Sala', branchName: branch?.name || 'Sucursal',
    scheduleText: schedule ? `${schedule.start} – ${schedule.end}` : `${booking.start} – ${booking.end}`,
  };
}

router.get('/', route(async (req, res) => {
  const filter = {};
  if (req.user.role === 'CLIENTE') {
    const client = await clientProfile(req);
    assert(client, 403, 'Cuenta de cliente inactiva');
    filter.clientId = client.id;
  } else {
    const employee = await employeeProfile(req);
    assert(employee, 403, 'Cuenta de empleado inactiva');
    if (req.user.role !== 'ADMIN') filter.branchId = employee.branchId;
  }
  if (req.query.status && ['PENDIENTE', 'ATENDIDA', 'CANCELADA'].includes(req.query.status)) filter.status = req.query.status;
  const reservations = await col('reservations')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();

  // Batch related records instead of issuing four queries for every row.
  const ids = (key) => [...new Set(reservations.map((booking) => booking[key]))];
  const [clients, rooms, branches, schedules] = await Promise.all([
    col('clients').find({ id: { $in: ids('clientId') } }).toArray(),
    col('rooms').find({ id: { $in: ids('roomId') } }).toArray(),
    col('branches').find({ id: { $in: ids('branchId') } }).toArray(),
    col('schedules').find({ id: { $in: ids('scheduleId') } }).toArray(),
  ]);
  const asMap = (rows) => new Map(rows.map((row) => [row.id, row]));
  const byClient = asMap(clients);
  const byRoom = asMap(rooms);
  const byBranch = asMap(branches);
  const bySchedule = asMap(schedules);
  const data = reservations.map((booking) => {
    const client = byClient.get(booking.clientId);
    const schedule = bySchedule.get(booking.scheduleId);
    return {
      ...publicRecord(booking),
      clientName: client ? `${client.name} ${client.lastName}` : 'Cliente',
      roomName: byRoom.get(booking.roomId)?.name || 'Sala',
      branchName: byBranch.get(booking.branchId)?.name || 'Sucursal',
      scheduleText: schedule
        ? `${schedule.start} – ${schedule.end}`
        : `${booking.start} – ${booking.end}`,
    };
  });
  res.json({ data });
}));

router.post('/', route(async (req, res) => {
  const input = validate(bookingSchema, req.body);
  const [room, slot] = await Promise.all([
    col('rooms').findOne({ id: input.roomId, status: 'ACTIVO' }),
    col('schedules').findOne({ id: input.scheduleId }),
  ]);
  assert(room && slot, 422, 'Sala u horario no disponible');
  assert(input.partySize <= (room.capacity || 1), 422, 'La sala no admite ese número de personas');
  const branch = await col('branches').findOne({ id: room.branchId, status: 'ACTIVO' });
  assert(branch, 422, 'La sucursal no está disponible');

  let client;
  if (req.user.role === 'CLIENTE') {
    client = await clientProfile(req);
  } else {
    const employee = await employeeProfile(req);
    assertSameBranch(employee, room.branchId, req.user);
    client = await col('clients').findOne({ id: input.clientId, status: 'ACTIVO' });
  }
  assert(client, 422, 'Selecciona un cliente activo');
  const guests = await normalizedGuests(input, client);
  const startAt = spaInstant(input.date, slot.start);
  const endAt = spaInstant(input.date, slot.end);
  assert(!Number.isNaN(startAt.getTime()) && startAt > new Date(), 422, 'La reservación debe ser para una fecha y hora futuras');
  // One slot per room, date and schedule. The unique partial index guards simultaneous requests.
  const data = {
    id: await nextId('reservations'), clientId: client.id,
    roomId: room.id, branchId: room.branchId, scheduleId: slot.id,
    partySize: input.partySize, guests,
    date: input.date, start: slot.start, end: slot.end, startAt, endAt,
    status: 'PENDIENTE', blocksSlot: true,
    slotKey: `${room.id}:${input.date}:${slot.id}`,
    createdAt: new Date(), updatedAt: new Date(),
  };
  try { await col('reservations').insertOne(data); }
  catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'Este horario ya está reservado para la sala seleccionada');
    throw error;
  }
  await notifyBooking(data, client, room, 'NUEVA');
  res.status(201).json({ data: await bookingDetails(data) });
}));

router.patch('/:id', route(async (req, res) => {
  assert(isStaff(req.user), 403, 'Los clientes no pueden modificar reservaciones');
  const employee = await employeeProfile(req);
  const id = idParam(req.params.id);
  const old = await col('reservations').findOne({ id });
  assert(old, 404, 'Reservación no encontrada');
  assertSameBranch(employee, old.branchId, req.user);
  assert(old.status === 'PENDIENTE', 409, 'Solo se pueden modificar reservaciones pendientes');
  const input = validate(bookingSchema, req.body);
  const [room, slot, client] = await Promise.all([
    col('rooms').findOne({ id: input.roomId, status: 'ACTIVO' }),
    col('schedules').findOne({ id: input.scheduleId }),
    col('clients').findOne({ id: input.clientId, status: 'ACTIVO' }),
  ]);
  assert(room && slot && client, 422, 'Sala, horario o cliente inválido');
  const guests = input.guests ? await normalizedGuests(input, client) :
    input.partySize === (old.partySize || 1) && Array.isArray(old.guests)
      ? old.guests : await normalizedGuests(input, client);
  assert(input.partySize <= (room.capacity || 1), 422, 'La sala no admite ese número de personas');
  assertSameBranch(employee, room.branchId, req.user);
  const startAt = spaInstant(input.date, slot.start);
  assert(startAt > new Date(), 422, 'El nuevo horario debe estar en el futuro');
  try {
    const changed = await col('reservations').updateOne({ id, status: 'PENDIENTE' }, {
      $set: {
        clientId: client.id, roomId: room.id, branchId: room.branchId,
        scheduleId: slot.id, date: input.date, partySize: input.partySize, guests,
        start: slot.start, end: slot.end, startAt,
        endAt: spaInstant(input.date, slot.end),
        slotKey: `${room.id}:${input.date}:${slot.id}`, updatedAt: new Date(),
      },
    });
    assert(changed.matchedCount === 1, 409, 'La reservación ya fue modificada o cancelada');
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'El horario seleccionado ya está ocupado');
    throw error;
  }
  res.json({ data: await bookingDetails(await col('reservations').findOne({ id })) });
}));

router.post('/:id/cancel', route(async (req, res) => {
  const id = idParam(req.params.id);
  const item = await col('reservations').findOne({ id });
  assert(item, 404, 'Reservación no encontrada');
  if (req.user.role === 'CLIENTE') {
    const client = await clientProfile(req);
    assert(client?.id === item.clientId, 403, 'No puedes cancelar reservas de otra persona');
  } else {
    assertSameBranch(await employeeProfile(req), item.branchId, req.user);
  }
  assert(item.status === 'PENDIENTE', 409, 'Solo se pueden cancelar reservaciones pendientes');
  const changed = await col('reservations').findOneAndUpdate(
    { id, status: 'PENDIENTE' },
    { $set: { status: 'CANCELADA', blocksSlot: false, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  assert(changed, 409, 'La reservación ya fue atendida o cancelada');
  const [client, room] = await Promise.all([
    col('clients').findOne({ id: changed.clientId }),
    col('rooms').findOne({ id: changed.roomId }),
  ]);
  await notifyBooking(changed, client, room, 'CANCELADA');
  res.json({ data: await bookingDetails(changed) });
}));

export default router;
