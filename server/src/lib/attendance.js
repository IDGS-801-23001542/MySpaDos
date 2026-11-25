// Una cita pasa a NO_ASISTIO solamente después de terminar su horario
// Y transcurrido el margen de espera, nunca durante el tratamiento.
export const NO_SHOW_GRACE_MINUTES = (() => {
  const number = Number(process.env.MYSPA_NO_SHOW_GRACE_MINUTES || 120);
  return Number.isInteger(number) && number >= 1 && number <= 1440 ? number : 120;
})();

export function noShowCutoff(now = new Date(), graceMinutes = NO_SHOW_GRACE_MINUTES) {
  return new Date(now.getTime() - graceMinutes * 60_000);
}

export function reviewIsDue(booking, now = new Date()) {
  return booking?.status === 'PENDIENTE' && booking?.endAt
    && new Date(booking.endAt).getTime() <= now.getTime();
}

// Importar la colección de forma dinámica mantiene las pruebas puras sin Atlas.
export async function reconcileExpiredReservations(now = new Date()) {
  const { col } = await import('./db.js');
  return col('reservations').updateMany({
    status: 'PENDIENTE', endAt: { $lte: noShowCutoff(now) },
  }, { $set: {
    status: 'NO_ASISTIO', blocksSlot: false,
    attendanceDecision: 'AUTOMATICA', attendanceMarkedAt: now, updatedAt: now,
  } });
}
