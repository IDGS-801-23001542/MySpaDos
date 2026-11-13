import nodemailer from 'nodemailer';
import { config } from './config.js';

export function emailReady() {
  return !!(config.smtp.host && config.smtp.user && config.smtp.pass);
}

export async function sendMail({ to, subject, text }) {
  if (!emailReady()) {
    console.warn('[SMTP] No configurado. El evento se guardó sin correo.');
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  await transporter.sendMail({
    from: config.smtp.from, to, subject, text,
  });
  return true;
}

export async function notifyBooking(booking, client, room, action) {
  if (!client?.email) return;
  const subject = action === 'NUEVA' ? 'MySpa2 | Nueva reservación' : 'MySpa2 | Reservación cancelada';
  const text = `Hola, ${client.name}.\n\n${action === 'NUEVA' ? 'Tu reservación se registró' : 'Tu reservación fue cancelada'}.\nSala: ${room.name}\nFecha: ${booking.date}\nHorario: ${booking.start} a ${booking.end}\nEstado: ${booking.status}\n\nMySpa2`;
  try { await sendMail({ to: client.email, subject, text }); }
  catch (error) { console.error('[SMTP] Error al enviar notificación:', error.message); }
}
