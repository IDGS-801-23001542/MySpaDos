import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servicePersonnel } from '../server/src/lib/servicePersonnel.js';

const rows = [
  { id: 1, name: 'Gerente', branchId: 1, status: 'ACTIVO', email: 'private' },
  { id: 2, name: 'Terapeuta', branchId: 2, status: 'ACTIVO', email: 'private' },
  { id: 3, name: 'Inactivo', branchId: 2, status: 'INACTIVO' },
  { id: 4, name: 'Personal Valle', branchId: 3, status: 'ACTIVO' },
];
function fakeCollection(records) {
  return { find(filter) {
    let selected = records.filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
    const cursor = {
      project(fields) {
        selected = selected.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => fields[key] === 1)));
        return cursor;
      },
      sort() { return cursor; },
      async toArray() { return selected; },
    };
    return cursor;
  } };
}

test('una cita en Jardines lista a su personal activo, no al gerente de Centro', async () => {
  assert.deepEqual(await servicePersonnel(fakeCollection(rows), { branchId: 2 }), [{ id: 2, name: 'Terapeuta' }]);
});
test('una cita en Valle conserva su propia sucursal', async () => {
  assert.deepEqual((await servicePersonnel(fakeCollection(rows), { branchId: 3 })).map((e) => e.id), [4]);
});
test('sin personal activo devuelve una lista vacía sin atribuir el servicio a otra sucursal', async () => {
  assert.deepEqual(await servicePersonnel(fakeCollection(rows), { branchId: 99 }), []);
});
