import { Router } from 'express';
import { col } from '../lib/db.js';
import { route, assert } from '../lib/http.js';
import { requireEmployee } from '../lib/security.js';

const router = Router();
router.use(requireEmployee);

router.get('/', route(async (req, res) => {
  const employee = await col('employees').findOne({ userId: req.user.id });
  assert(employee, 403, 'Empleado no encontrado');
  const scope = req.user.role === 'ADMIN' ? {} : { branchId: employee.branchId };
  const branchId = employee.branchId;
  const [clients, employees, products, rooms, pending, attended, [serviceStats], recent] = await Promise.all([
    col('clients').countDocuments({ status: 'ACTIVO' }),
    col('employees').countDocuments({ status: 'ACTIVO' }),
    col('products').countDocuments({ status: 'ACTIVO' }),
    col('rooms').countDocuments({ ...scope, status: 'ACTIVO' }),
    col('reservations').countDocuments({ ...scope, status: 'PENDIENTE' }),
    col('reservations').countDocuments({ ...scope, status: 'ATENDIDA' }),
    col('services').aggregate([
      { $match: scope },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' } } },
    ]).toArray(),
    col('reservations').find(scope).sort({ createdAt: -1 }).limit(6).toArray(),
  ]);
  res.json({
    data: {
      clients, employees, products, rooms, pending, attended,
      servicesCount: serviceStats?.count || 0,
      revenue: Math.round((serviceStats?.total || 0) * 100) / 100,
      recent: recent.map(({ _id, ...rest }) => rest),
    },
  });
}));

export default router;
