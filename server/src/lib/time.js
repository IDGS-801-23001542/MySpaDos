// Demo branches are in León, Guanajuato, Mexico (UTC-06:00 in 2026).
// This explicit offset avoids different results on a cloud server running in UTC.
export function spaInstant(date, time) {
  return new Date(`${date}T${time}:00-06:00`);
}


export function validCalendarDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
