// Fecha de operación del spa (León, Guanajuato), independiente del huso horario del servidor.
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function spaDayISO(instant = new Date()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(instant)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function plusDays(dayISO, days) {
  const day = new Date(`${dayISO}T12:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function attendanceCounts(bookings) {
  const counts = { total: bookings.length, pending: 0, attended: 0, canceled: 0, noShow: 0 };
  for (const booking of bookings) {
    if (booking.status === 'PENDIENTE') counts.pending += 1;
    if (booking.status === 'ATENDIDA') counts.attended += 1;
    if (booking.status === 'CANCELADA') counts.canceled += 1;
    if (booking.status === 'NO_ASISTIO') counts.noShow += 1;
  }
  return counts;
}

export function nextSevenDays(bookings, today) {
  const counts = new Map();
  for (const booking of bookings) {
    if (booking.status === 'PENDIENTE' || booking.status === 'ATENDIDA') {
      counts.set(booking.date, (counts.get(booking.date) || 0) + 1);
    }
  }
  return Array.from({ length: 7 }, (_, offset) => {
    const date = plusDays(today, offset);
    return { date, count: counts.get(date) || 0 };
  });
}

// Las próximas citas comienzan mañana; las de hoy aparecen exclusivamente en la agenda de hoy.
export function futureReservationsFilter(scope, tomorrow) {
  return { ...scope, status: 'PENDIENTE', date: { $gte: tomorrow } };
}
