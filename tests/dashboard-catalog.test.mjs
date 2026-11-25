import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogStatusFilter, catalogSort } from '../server/src/lib/catalogListing.js';
import { spaDayISO, plusDays, attendanceCounts, nextSevenDays, futureReservationsFilter } from '../server/src/lib/dashboardAnalytics.js';

test('horarios no se filtran por status, pero productos sí', () => {
  assert.deepEqual(catalogStatusFilter('schedules', 'ACTIVO'), {});
  assert.deepEqual(catalogStatusFilter('schedules', 'INACTIVO'), {});
  assert.deepEqual(catalogStatusFilter('products', 'ACTIVO'), { status: 'ACTIVO' });
  assert.deepEqual(catalogStatusFilter('products', 'OTRO'), {});
  assert.deepEqual(catalogSort('schedules'), { start: 1, end: 1, id: 1 });
});

test('la fecha operativa respeta la hora de México aunque el servidor esté en UTC', () => {
  assert.equal(spaDayISO(new Date('2026-11-26T03:30:00.000Z')), '2026-11-25');
  assert.equal(spaDayISO(new Date('2026-11-26T06:30:00.000Z')), '2026-11-26');
  assert.equal(plusDays('2026-12-30', 3), '2027-01-02');
});

test('las métricas distinguen pendiente, atendida, cancelada y no asistió', () => {
  assert.deepEqual(attendanceCounts([
    { status: 'PENDIENTE' }, { status: 'ATENDIDA' },
    { status: 'CANCELADA' }, { status: 'NO_ASISTIO' },
  ]), { total: 4, pending: 1, attended: 1, canceled: 1, noShow: 1 });
});

test('las barras de siete días incluyen solo reservaciones vigentes y atendidas', () => {
  const result = nextSevenDays([
    { date: '2026-11-25', status: 'PENDIENTE' },
    { date: '2026-11-25', status: 'CANCELADA' },
    { date: '2026-11-26', status: 'ATENDIDA' },
    { date: '2026-11-27', status: 'NO_ASISTIO' },
  ], '2026-11-25');
  assert.equal(result.length, 7);
  assert.deepEqual(result.slice(0, 3).map((item) => item.count), [1, 1, 0]);
});

test('las próximas citas solo consideran mañana en adelante y respetan la sucursal', () => {
  assert.deepEqual(futureReservationsFilter({ branchId: 2 }, '2026-11-26'), {
    branchId: 2, status: 'PENDIENTE', date: { $gte: '2026-11-26' },
  });
});
