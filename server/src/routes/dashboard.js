import { Router } from 'express';
import { col } from '../lib/db.js';
import { route, assert, publicRecord } from '../lib/http.js';
import { requireEmployee } from '../lib/security.js';
import { reconcileExpiredReservations } from '../lib/attendance.js';
import { spaInstant } from '../lib/time.js';
import { spaDayISO, plusDays, attendanceCounts, nextSevenDays, futureReservationsFilter } from '../lib/dashboardAnalytics.js';

const router = Router();
router.use(requireEmployee);

router.get('/', route(async (req, res) => {
  await reconcileExpiredReservations();
  const employee = await col('employees').findOne({ userId: req.user.id, status: 'ACTIVO' });
  assert(employee, 403, 'Empleado activo no encontrado');

  const isAdmin = req.user.role === 'ADMIN';
  const scope = isAdmin ? {} : { branchId: employee.branchId };
  const now = new Date();
  const today = spaDayISO(now);
  const tomorrow = plusDays(today, 1);
  const lastDay = plusDays(today, 6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const startOfToday = spaInstant(today, '00:00');
  const startOfTomorrow = spaInstant(tomorrow, '00:00');
  const startOfMonth = spaInstant(monthStart, '00:00');

  const [clients, employees, products, rooms, pending, attended,
    serviceTotals, serviceMonth, servicesToday, todayBookings, upcomingBookings,
    weeklyBookings, pendingReview, stockAlerts, branch] = await Promise.all([
    col('clients').countDocuments({ status: 'ACTIVO' }),
    col('employees').countDocuments({ ...scope, status: 'ACTIVO' }),
    col('products').countDocuments({ status: 'ACTIVO' }),
    col('rooms').countDocuments({ ...scope, status: 'ACTIVO' }),
    col('reservations').countDocuments({ ...scope, status: 'PENDIENTE' }),
    col('reservations').countDocuments({ ...scope, status: 'ATENDIDA' }),
    col('services').aggregate([
      { $match: scope },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' } } },
    ]).toArray(),
    col('services').aggregate([
      { $match: { ...scope, dateTime: { $gte: startOfMonth, $lt: startOfTomorrow } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' } } },
    ]).toArray(),
    col('services').countDocuments({ ...scope, dateTime: { $gte: startOfToday, $lt: startOfTomorrow } }),
    col('reservations').find({ ...scope, date: today }).sort({ start: 1, id: 1 }).toArray(),
    col('reservations').find(futureReservationsFilter(scope, tomorrow))
      .sort({ date: 1, start: 1, id: 1 }).limit(10).toArray(),
    col('reservations').find({ ...scope, date: { $gte: today, $lte: lastDay }, status: { $in: ['PENDIENTE', 'ATENDIDA'] } })
      .project({ date: 1, status: 1 }).toArray(),
    col('reservations').countDocuments({ ...scope, status: 'PENDIENTE', endAt: { $lte: now } }),
    isAdmin ? col('products').countDocuments({ status: 'ACTIVO', trackStock: { $ne: false },
      $expr: { $lte: [{ $ifNull: ['$stock', 0] }, { $ifNull: ['$minStock', 0] }] } }) : Promise.resolve(null),
    isAdmin ? Promise.resolve(null) : col('branches').findOne({ id: employee.branchId }),
  ]);

  const relevant = [...todayBookings, ...upcomingBookings];
  const clientIds = [...new Set(relevant.map((r) => r.clientId).filter(Number.isInteger))];
  const roomIds = [...new Set(relevant.map((r) => r.roomId).filter(Number.isInteger))];
  const branchIds = [...new Set(relevant.map((r) => r.branchId).filter(Number.isInteger))];
  const [people, spaces, branches] = await Promise.all([
    clientIds.length ? col('clients').find({ id: { $in: clientIds } }).project({ id: 1, name: 1, lastName: 1 }).toArray() : [],
    roomIds.length ? col('rooms').find({ id: { $in: roomIds } }).project({ id: 1, name: 1 }).toArray() : [],
    branchIds.length ? col('branches').find({ id: { $in: branchIds } }).project({ id: 1, name: 1 }).toArray() : [],
  ]);
  const clientMap = new Map(people.map((p) => [p.id, `${p.name} ${p.lastName || ''}`.trim()]));
  const roomMap = new Map(spaces.map((r) => [r.id, r.name]));
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  function displayBooking(booking) {
    return {
      ...publicRecord(booking),
      clientName: clientMap.get(booking.clientId) || 'Cliente',
      roomName: roomMap.get(booking.roomId) || 'Sala',
      branchName: branchMap.get(booking.branchId) || 'Sucursal',
    };
  }

  const totals = serviceTotals[0] || { count: 0, total: 0 };
  const monthly = serviceMonth[0] || { count: 0, total: 0 };
  const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
  res.json({ data: {
    // Los campos históricos se conservan por compatibilidad.
    clients, employees, products, rooms, pending, attended,
    servicesCount: totals.count,
    revenue: roundMoney(totals.total), // Compatibilidad: representa COSTOS, no ingresos.
    recent: todayBookings.slice(0, 6).map(displayBooking),
    scopeLabel: isAdmin ? 'Todas las sucursales' : (branch?.name || 'Tu sucursal'),
    todayDate: today,
    today: attendanceCounts(todayBookings),
    servicesToday,
    upcomingCount: await col('reservations').countDocuments(futureReservationsFilter(scope, tomorrow)),
    pendingReview,
    stockAlerts,
    monthlyServiceCost: roundMoney(monthly.total),
    monthlyServicesCount: monthly.count,
    todayReservations: todayBookings.map(displayBooking),
    upcomingReservations: upcomingBookings.map(displayBooking),
    nextSevenDays: nextSevenDays(weeklyBookings, today),
  } });
}));

export default router;
