import { spaInstant, validCalendarDate } from '../lib/time.js';
import { Router } from 'express';
import { col } from '../lib/db.js';
import { idParam, route, publicRecord, searchRegex, assert } from '../lib/http.js';

const router = Router();

router.get('/branches', route(async (req, res) => {
  const items = await col('branches').find({ status: 'ACTIVO' }).sort({ name: 1 }).toArray();
  res.json({ data: items.map(publicRecord) });
}));

router.get('/rooms', route(async (req, res) => {
  const query = { status: 'ACTIVO' };
  if (req.query.branchId) query.branchId = idParam(req.query.branchId);
  const regex = searchRegex(req.query.q);
  if (regex) query.$or = [{ name: regex }, { description: regex }];
  const rooms = await col('rooms').find(query).sort({ name: 1 }).toArray();
  const branches = await col('branches').find({ status: 'ACTIVO' }).toArray();
  const map = new Map(branches.map((branch) => [branch.id, branch]));
  res.json({ data: rooms.filter((r) => map.has(r.branchId)).map((room) => ({ ...publicRecord(room), branchName: map.get(room.branchId).name })) });
}));

router.get('/rooms/:id', route(async (req, res) => {
  const room = await col('rooms').findOne({ id: idParam(req.params.id), status: 'ACTIVO' });
  assert(room, 404, 'Sala no encontrada');
  const branch = await col('branches').findOne({ id: room.branchId, status: 'ACTIVO' });
  assert(branch, 404, 'Sucursal no disponible');
  res.json({ data: { ...publicRecord(room), branch: publicRecord(branch) } });
}));

router.get('/schedules', route(async (req, res) => {
  const slots = await col('schedules').find({}).sort({ start: 1 }).toArray();
  res.json({ data: slots.map(publicRecord) });
}));

router.get('/treatments', route(async (req, res) => {
  const items = await col('treatments').find({ status: 'ACTIVO' }).sort({ name: 1 }).toArray();
  res.json({ data: items.map(publicRecord) });
}));

router.get('/availability', route(async (req, res) => {
  const roomId = idParam(req.query.roomId);
  const date = String(req.query.date || '');
  assert(validCalendarDate(date), 422, 'Fecha inválida');
  const room = await col('rooms').findOne({ id: roomId, status: 'ACTIVO' });
  assert(room, 404, 'Sala no disponible');
  assert(await col('branches').findOne({ id: room.branchId, status: 'ACTIVO' }),
    404, 'Sucursal no disponible');
  const schedules = await col('schedules').find({}).sort({ start: 1 }).toArray();
  const reserved = await col('reservations').find({ roomId, date, blocksSlot: true }).project({ scheduleId: 1 }).toArray();
  const busy = new Set(reserved.map((item) => item.scheduleId));
  const today = new Date();
  const data = schedules.map((slot) => ({ ...publicRecord(slot), available: !busy.has(slot.id) && spaInstant(date, slot.start) > today }));
  res.json({ data });
}));

export default router;
