import { useEffect, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Modal } from './UI.jsx';
import { api, shortDate } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { attendanceReducer, initialAttendanceState } from '../reducers/attendanceReducer.js';

/** Aviso cuando inicia la cita y confirmación cuando termina.
 * Solo personal autenticado; la ausencia automática sigue en el backend. */
export function AttendancePrompt() {
  const { identity } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(attendanceReducer, initialAttendanceState);
  const canReview = ['ADMIN', 'EMPLEADO'].includes(identity?.user?.role)
    && location.pathname.startsWith('/personal')
    && !location.pathname.startsWith('/personal/servicios');

  useEffect(() => {
    if (!canReview) {
      dispatch({ type: 'CLEAR' });
      return undefined;
    }
    let active = true;
    async function refresh() {
      try {
        const records = await api('/reservations?status=PENDIENTE');
        if (!active) return;
        const now = Date.now();
        const due = records.filter((item) => item.startAt && new Date(item.startAt).getTime() <= now)
          .map((item) => ({
            ...item,
            finished: Boolean(item.endAt && new Date(item.endAt).getTime() <= now),
          }))
          .map((item) => ({ ...item, noticeKey: `${item.id}:${item.finished ? 'fin' : 'inicio'}` }))
          .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        dispatch({ type: 'SYNC', due });
      } catch {
        // La conexión puede estar temporalmente caída en la PWA.
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('myspa:reservations-updated', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('myspa:reservations-updated', refresh);
    };
  }, [canReview, identity?.user?.id]);

  if (!canReview) return null;
  const booking = state.due.find((item) => !state.dismissed.includes(item.noticeKey));
  if (!booking) return null;

  function dismiss() {
    dispatch({ type: 'DISMISS', id: booking.noticeKey });
  }
  async function confirmAbsence() {
    dispatch({ type: 'START' });
    try {
      await api(`/reservations/${booking.id}/no-show`, { method: 'POST' });
      dispatch({ type: 'DONE', id: booking.id });
      window.dispatchEvent(new Event('myspa:reservations-updated'));
    } catch (error) {
      dispatch({ type: 'ERROR', message: error.message });
    }
  }
  function openService() {
    dismiss();
    navigate(`/personal/servicios?reservacion=${booking.id}`);
  }

  return <Modal
    title={booking.finished ? 'Confirmar asistencia' : 'Es hora de la cita'}
    subtitle={booking.finished
      ? 'El horario terminó y todavía no se ha registrado el servicio.'
      : 'La reservación ya inició: confirma que el personal esté listo para recibir al cliente.'}
    onClose={dismiss}>
    <div className="form-stack attendance-content">
      <div className="attendance-booking-info">
        <span><strong>Cliente:</strong> {booking.clientName}</span>
        <span><strong>Sala:</strong> {booking.roomName}</span>
        <span><strong>Sucursal:</strong> {booking.branchName}</span>
        <span><strong>Fecha:</strong> {shortDate(booking.date)}</span>
        <span><strong>Horario:</strong> {booking.scheduleText}</span>
      </div>
      <p className="muted">{booking.finished
        ? 'Si se prestó el tratamiento, registra el servicio. Si no acudió, marca la ausencia. Sin respuesta, el servidor la registrará al finalizar el margen de espera.'
        : 'Esta es una notificación al personal. La opción «No asistió» aparecerá solo después de que termine el horario.'}</p>
      <Alert>{state.error}</Alert>
      <div className="modal-actions">
        <button type="button" className="button button-outline" disabled={state.saving} onClick={dismiss}>Revisar luego</button>
        {booking.finished && <button type="button" className="button button-danger-outline"
          disabled={state.saving} onClick={confirmAbsence}>No asistió</button>}
        <button type="button" className="button button-primary" disabled={state.saving}
          onClick={openService}>Registrar servicio</button>
      </div>
    </div>
  </Modal>;
}
