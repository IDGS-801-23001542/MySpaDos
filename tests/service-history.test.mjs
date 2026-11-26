import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceHistoryFilter, serviceHistoryPage } from '../server/src/lib/serviceHistory.js';
test('history retains branch scope and searches literal text', () => {
  const filter = serviceHistoryFilter({ branchId: 2 }, 'a.*');
  assert.equal(filter.branchId, 2);
  assert.ok(filter.$or[0].clientName.test('A.*'));
  assert.ok(!filter.$or[0].clientName.test('abc'));
  assert.deepEqual(serviceHistoryFilter({}, ''), {});
});
test('history searches service and reservation folios', () => {
  const { $or } = serviceHistoryFilter({}, '#301');
  assert.ok($or.some((entry) => entry.id === 301));
  assert.ok($or.some((entry) => entry.reservationId === 301));
});
test('history can access records beyond the old 300 cap', () => {
  assert.deepEqual(serviceHistoryPage(26, 400), { page:26, pages:34, skip:300, pageSize:12 });
  assert.equal(serviceHistoryPage(999, 400).page, 34);
  assert.equal(serviceHistoryPage(-1, 0).page, 1);
});
