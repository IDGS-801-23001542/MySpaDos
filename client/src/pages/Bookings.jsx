import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, Edit3, Plus, Search, XCircle, UserX } from 'lucide-react';
import { api, localDateISO, shortDate } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import BookingGuests, { resizeGuests } from '../components/BookingGuests.jsx';
import { Alert, Empty, Field, Modal, PageHeader, PrimaryButton, StatusBadge } from '../components/UI.jsx';

const empty = { clientId: '', roomId: '', scheduleId: '', date: '', partySize: 1, guests: [{ name: '', phone: '', treatmentIds: [] }] };

export default function BookingsPage() {
  const { identity } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [slots, setSlots] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const myRooms = useMemo(() => rooms.filter((room) => identity.user.role === 'ADMIN' || room.branchId === identity.profile.branchId), [rooms, identity.profile.branchId]);

  async function load() {
    try { setItems(await api(`/reservations${filter ? `?status=${filter}` : ''}`)); }
    catch (e) { setError(e.message); }
  }

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('myspa:reservations-updated', refresh);
    return () => window.removeEventListener('myspa:reservations-updated', refresh);
  }, [filter]);
  useEffect(() => {
    api('/manage/clients?status=ACTIVO').then(setClients).catch(() => {});
    api('/public/rooms').then(setRooms).catch(() => {});
    api('/public/treatments').then(setTreatments).catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.roomId || !form.date) { setSlots([]); return; }
    api(`/public/availability?roomId=${form.roomId}&date=${form.date}`).then(setSlots).catch((e) => setError(e.message));
  }, [form.roomId, form.date]);

  function openNew() { setEdit('new'); setForm({ ...empty, guests: [{ name: '', phone: '', treatmentIds: [] }] }); setError(''); }
  function openEdit(item) {
    setEdit(item);
    const size = item.partySize || 1;
    const fallback = { name: item.clientName || '', phone: '', treatmentIds: [] };
    setForm({ clientId: item.clientId, roomId: item.roomId, scheduleId: item.scheduleId,
      date: item.date, partySize: size, guests: resizeGuests(item.guests?.length ? item.guests : [fallback], size) });
    setError('');
  }
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api(edit === 'new' ? '/reservations' : `/reservations/${edit.id}`, {
        method: edit === 'new' ? 'POST' : 'PATCH', body: form,
      });
      setEdit(null); setMessage('Reservación guardada correctamente.'); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function cancel(item) {
    if (!window.confirm('¿Cancelar esta reservación?')) return;
    setBusy(true); setError('');
    try {
      await api(`/reservations/${item.id}/cancel`, { method: 'POST' });
      setMessage('Reservación cancelada. Se notificará al cliente si SMTP está configurado.');
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function noShow(item) {
    if (!window.confirm(`¿Confirmar que ${item.clientName} no asistió?`)) return;
    setBusy(true); setError('');
    try {
      await api(`/reservations/${item.id}/no-show`, { method: 'POST' });
      setMessage('Ausencia registrada.'); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const visible = items.filter((item) => [item.id, item.clientName, item.roomName, item.branchName, item.date, item.start, item.end, item.status].some((value) => String(value ?? '').toLowerCase().includes(query.toLowerCase())));
  return <div className="staff-view">
    <PageHeader eyebrow="AGENDA DE BIENESTAR" title="Reservaciones" subtitle="Organiza los espacios y horarios de tu sucursal." actions={<button className="button button-primary" onClick={openNew}><Plus size={18} /> Nueva reservación</button>} />
    <div className="surface-card table-shell"><div className="table-toolbar"><div className="search-field"><Search size={18} /><input aria-label="Buscar reservaciones" placeholder="Buscar cliente, sala, fecha o folio" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <select aria-label="Filtrar estado" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="ATENDIDA">Atendidas</option><option value="CANCELADA">Canceladas</option><option value="NO_ASISTIO">No asistió</option></select></div>
      <Alert>{error}</Alert>{message && <Alert type="success">{message}</Alert>}
      {visible.length ? <div className="table-responsive"><table className="data-table"><thead><tr><th>Cliente</th><th>Sala</th><th>Fecha / horario</th><th>Estatus</th><th>Acciones</th></tr></thead><tbody>
        {visible.map((item) => <tr key={item.id}><td><strong>{item.clientName}</strong><small>Reservación #{item.id}</small></td><td>{item.roomName}<small>{item.branchName}</small></td><td>{shortDate(item.date)}<small>{item.scheduleText} · {item.partySize || 1} persona(s)</small>
          {item.guests?.length > 0 && <small>Asistentes: {item.guests.map((guest) => guest.name).join(' y ')}</small>}</td><td><StatusBadge value={item.status} /></td>
          <td><div className="table-actions">{item.status === 'PENDIENTE' ? <>{item.endAt && new Date(item.endAt) <= new Date()
            ? <><button title="Marcar No asistió" disabled={busy} onClick={() => noShow(item)}><UserX size={17} /></button><button type="button" className="button button-outline" title="Registrar servicio" disabled={busy} onClick={() => navigate(`/personal/servicios?reservacion=${item.id}`)}>Atender</button></>
            : <><button title="Editar" onClick={() => openEdit(item)}><Edit3 size={17} /></button><button title="Cancelar" disabled={busy} onClick={() => cancel(item)}><XCircle size={17} /></button></>}</> : <span className="muted">—</span>}</div></td></tr>)}
      </tbody></table></div> : <Empty title="La agenda está vacía" description="Las nuevas reservaciones aparecerán aquí." />}
    </div>
    {edit && <Modal title={edit === 'new' ? 'Nueva reservación' : 'Editar reservación'} subtitle="Selecciona un cliente y un horario libre de la sucursal." onClose={() => setEdit(null)}>
      <form className="form-stack" onSubmit={save}><Alert>{error}</Alert>
        <Field label="Cliente"><select required value={form.clientId} onChange={(e) => {
          const person = clients.find((client) => client.id === Number(e.target.value));
          const guest = { name: person ? `${person.name} ${person.lastName}` : '', phone: person?.phone || '', treatmentIds: [] };
          setForm({ ...form, clientId: e.target.value, guests: resizeGuests([guest], form.partySize) });
        }}><option value="">Selecciona un cliente</option>{clients.map((c) => <option value={c.id} key={c.id}>{c.name} {c.lastName} · {c.clientNumber}</option>)}</select></Field>
        <Field label="Sala"><select required value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value, scheduleId: '', partySize: 1, guests: resizeGuests(form.guests, 1) })}><option value="">Selecciona la sala</option>{myRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Personas">
          <select value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value), guests: resizeGuests(form.guests, Number(e.target.value)) })}>
            <option value={1}>1 persona</option>
            {rooms.find((room) => room.id === Number(form.roomId))?.capacity >= 2 && <option value={2}>2 personas</option>}
          </select>
        </Field>
        <BookingGuests guests={form.guests} partySize={form.partySize} treatments={treatments}
          onChange={(next) => setForm({ ...form, guests: next })} />
        <Field label="Fecha"><input type="date" required value={form.date} min={localDateISO()} onChange={(e) => setForm({ ...form, date: e.target.value, scheduleId: '' })} /></Field>
        <Field label="Horario"><select required value={form.scheduleId} onChange={(e) => setForm({ ...form, scheduleId: e.target.value })}><option value="">Selecciona un horario</option>{slots.map((slot) => <option key={slot.id} value={slot.id} disabled={!slot.available && slot.id !== Number(form.scheduleId)}>{slot.start} – {slot.end} {!slot.available && slot.id !== Number(form.scheduleId) ? '· Ocupado' : ''}</option>)}</select></Field>
        <div className="modal-actions"><button className="button button-outline" type="button" onClick={() => setEdit(null)}>Cancelar</button><PrimaryButton busy={busy} type="submit">Guardar reservación</PrimaryButton></div>
      </form>
    </Modal>}
  </div>;
}
