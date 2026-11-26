// The history never widens the caller's authorized branch scope.
export const HISTORY_PAGE_SIZE = 12;
export function serviceHistoryFilter(scope, query = '') {
  const text = String(query).trim().slice(0, 80);
  if (!text) return { ...scope };
  const literal = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const fields = ['clientName', 'employeeName', 'roomName', 'treatments.name',
    'treatments.guestName', 'treatments.products.name', 'treatments.products.brand'];
  const alternatives = fields.map((field) => ({ [field]: literal }));
  const id = Number(text.replace(/^#/, ''));
  if (Number.isSafeInteger(id) && id > 0) alternatives.push({ id }, { reservationId: id });
  return { ...scope, $or: alternatives };
}
export function serviceHistoryPage(value, total) {
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const requested = Number(value);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  return { page, pages, skip: (page - 1) * HISTORY_PAGE_SIZE, pageSize: HISTORY_PAGE_SIZE };
}
