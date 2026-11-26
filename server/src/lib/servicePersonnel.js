/** List only real, active personnel assigned to the appointment's branch.
 * No global catalog limit and no dependency on the administrator's branch.
 */
export function servicePersonnel(employees, booking) {
  return employees.find({ branchId: booking.branchId, status: 'ACTIVO' })
    .project({ _id: 0, id: 1, name: 1, lastName: 1, secondLastName: 1, position: 1 })
    .sort({ name: 1, lastName: 1 }).toArray();
}
