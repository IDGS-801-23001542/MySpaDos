// Los horarios son intervalos y no tienen estatus; no deben filtrarse como catálogos activos.
export function catalogStatusFilter(resource, status) {
  if (resource === 'schedules' || !['ACTIVO', 'INACTIVO'].includes(status)) return {};
  return { status };
}

export function catalogSort(resource) {
  return resource === 'schedules' ? { start: 1, end: 1, id: 1 } : { createdAt: -1, id: -1 };
}
