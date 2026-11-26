import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, ChevronLeft, ChevronRight, Edit3, Plus, PlusCircle, ReceiptText, Search, Trash2, X } from 'lucide-react';
import { api, dateLabel, money, shortDate, localDateTimeInput } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { Alert, Empty, Field, Modal, PageHeader, PrimaryButton, Spinner } from '../components/UI.jsx';

const newLine = (guestIndex = 0) => ({ guestIndex, treatmentId: '', products: [{ productId: '', quantity: 1 }] });

function suggestedLines(booking, treatments) {
  const lines = (booking?.guests || []).flatMap((guest, guestIndex) =>
    (guest.treatmentIds || []).map((treatmentId) => {
      const treatment = treatments.find((item) => item.id === treatmentId);
      if (!treatment) return null;
      return {
        guestIndex, treatmentId,
        products: treatment.defaultProducts?.length
          ? treatment.defaultProducts.map((entry) => ({ productId: entry.productId, quantity: entry.quantity }))
          : [{ productId: '', quantity: 1 }],
      };
    }).filter(Boolean));
  return lines.length ? lines : [newLine()];
}
const base = { reservationId: '', employeeId: '', dateTime: '', treatments: [newLine()] };

export default function ServicesPage() {
  const { identity } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [reservations, setReservations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [reservationContext, setReservationContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [contextAttempt, setContextAttempt] = useState(0);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [products, setProducts] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(base);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const suggestedFor = useRef(null);

  async function load() {
    setHistoryRefresh((value) => value + 1);
    setListLoading(true); setListError('');
    try {
      const allReservations = await api('/reservations?status=PENDIENTE');
      setReservations(allReservations);
    } catch (e) { setListError(e.message); }
    finally { setListLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    let active = true;
    setHistoryLoading(true); setHistoryError('');
    const params = new URLSearchParams({ page: String(page), q: debouncedQuery });
    api(`/services/history?${params}`).then((data) => {
      if (active) setHistory(data);
    }).catch((e) => { if (active) { setHistory(null); setHistoryError(e.message); } })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [page, debouncedQuery, historyRefresh]);
  useEffect(() => {
    let active = true;
    setCatalogReady(false); setCatalogError('');
    Promise.all([api('/manage/products?status=ACTIVO'), api('/manage/treatments?status=ACTIVO')])
      .then(([allProducts, allTreatments]) => {
        if (!active) return;
        setProducts(allProducts); setTreatments(allTreatments); setCatalogReady(true);
      }).catch((e) => { if (active) setCatalogError(e.message); });
    return () => { active = false; };
  }, [catalogAttempt]);

  const reservationId = Number(form.reservationId);
  const contextMatches = reservationContext?.booking?.id === reservationId;
  const selectedBooking = contextMatches ? reservationContext.booking : null;
  const myEmployees = contextMatches ? reservationContext.employees : [];
  const availableReservations = reservations.filter((r) => r.status === 'PENDIENTE');

  useEffect(() => {
    const id = Number(searchParams.get('reservacion'));
    if (!Number.isSafeInteger(id) || id <= 0) return;
    suggestedFor.current = null;
    setEdit('new'); setError(''); setReservationContext(null);
    setForm({ ...base, reservationId: id, dateTime: localDateTimeInput(), treatments: [newLine()] });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setReservationContext(null); setContextError('');
    if (!edit || !reservationId) { setContextLoading(false); return; }
    let active = true;
    setContextLoading(true);
    api(`/services/reservation/${reservationId}`).then((data) => {
      if (!active) return;
      setReservationContext(data);
      setForm((old) => Number(old.reservationId) !== reservationId ? old : {
        ...old, employeeId: data.employees.some((e) => e.id === Number(old.employeeId)) ? old.employeeId : '',
      });
    }).catch((e) => { if (active) setContextError(e.message); })
      .finally(() => { if (active) setContextLoading(false); });
    return () => { active = false; };
  }, [edit, reservationId, contextAttempt]);

  useEffect(() => {
    if (edit !== 'new' || !selectedBooking || !catalogReady || suggestedFor.current === selectedBooking.id) return;
    suggestedFor.current = selectedBooking.id;
    setForm((old) => Number(old.reservationId) !== selectedBooking.id ? old : {
      ...old, treatments: suggestedLines(selectedBooking, treatments),
    });
  }, [edit, selectedBooking, catalogReady, treatments]);

  const bookingUnavailable = edit === 'new' && selectedBooking && selectedBooking.status !== 'PENDIENTE';
  const employeeValid = myEmployees.some((employee) => employee.id === Number(form.employeeId));
  const canSave = catalogReady && treatments.length > 0 && products.length > 0 && contextMatches && !contextLoading && !contextError && !bookingUnavailable && employeeValid;

  const preview = useMemo(() => {
    let sum = 0;
    const breakdown = form.treatments.map((line) => {
      const cost = line.products.reduce((acc, p) => {
        const product = products.find((item) => item.id === Number(p.productId));
        return acc + (product?.usePrice || 0) * Number(p.quantity || 0);
      }, 0);
      sum += cost;
      return { treatment: treatments.find((t) => t.id === Number(line.treatmentId))?.name || 'Tratamiento por seleccionar', cost };
    });
    return { total: sum, breakdown };
  }, [form.treatments, products, treatments]);

  function newService() {
    suggestedFor.current = null;
    setEdit('new'); setError('');
    setReservationContext(null);
    setForm({ ...base,
      dateTime: localDateTimeInput(), treatments: [newLine()] });
  }
  function editService(service) {
    setEdit(service); setError('');
    setForm({
      reservationId: service.reservationId, employeeId: service.employeeId,
      dateTime: localDateTimeInput(service.dateTime),
      treatments: service.treatments.map((line) => ({ guestIndex: line.guestIndex || 0, treatmentId: line.treatmentId,
        products: line.products.map((p) => ({ productId: p.productId, quantity: p.quantity })) })),
    });
  }
  function updateLine(index, updater) {
    setForm((old) => ({ ...old, treatments: old.treatments.map((line, i) => i === index ? updater(line) : line) }));
  }
  function updateProduct(lineIndex, productIndex, changes) {
    updateLine(lineIndex, (line) => ({ ...line, products: line.products.map((p, i) => i === productIndex ? { ...p, ...changes } : p) }));
  }
  async function save(event) {
    event.preventDefault();
    if (!canSave) { setError('Selecciona una reservación disponible y un empleado activo de su sucursal.'); return; }
    setBusy(true); setError('');
    try {
      const body = {
        ...form, dateTime: new Date(form.dateTime).toISOString(),
        reservationId: Number(form.reservationId), employeeId: Number(form.employeeId),
        treatments: form.treatments.map((line) => ({ guestIndex: Number(line.guestIndex || 0), treatmentId: Number(line.treatmentId),
          products: line.products.map((p) => ({ productId: Number(p.productId), quantity: Number(p.quantity) })) })),
      };
      await api(edit === 'new' ? '/services' : `/services/${edit.id}`, {
        method: edit === 'new' ? 'POST' : 'PATCH', body,
      });
      setEdit(null); setMessage('Servicio guardado. Costos calculados y reservación actualizada.'); await load();
      window.dispatchEvent(new Event('myspa:reservations-updated'));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove(item) {
    if (!window.confirm('¿Eliminar físicamente este servicio? Esta operación no se puede deshacer.')) return;
    setBusy(true); setError('');
    try { await api(`/services/${item.id}`, { method: 'DELETE' }); await load(); setMessage('Servicio eliminado.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="staff-view">
    <PageHeader eyebrow="EXPERIENCIAS REALIZADAS" title="Servicios e historial" subtitle={identity.user.role === 'ADMIN' ? 'Consulta todos los servicios registrados de todas las sucursales, o registra una nueva atención.' : 'Consulta el historial de tu sucursal o registra una nueva atención.'} actions={<button className="button button-primary" onClick={newService}><Plus size={18} /> Registrar servicio</button>} />
    <Alert>{error}</Alert>{message && <Alert type="success">{message}</Alert>}
    {listError && <div><Alert>No fue posible cargar las reservaciones pendientes: {listError}</Alert><button type="button" className="button button-outline" onClick={load}>Actualizar lista</button></div>}
    <div className="service-guide" aria-label="Cómo registrar un servicio">
      <span><b>1</b> Elegir reservación pendiente</span>
      <span><b>2</b> Elegir quién atendió y ajustar tratamientos</span>
      <span><b>3</b> Revisar costos y guardar</span>
    </div>
    <section className="history-heading" aria-labelledby="service-history-title">
      <div><span className="eyebrow">REGISTRO DE ATENCIONES</span><h2 id="service-history-title">Historial completo</h2>
        <p>{identity.user.role === 'ADMIN' ? 'Todas las sucursales' : 'Tu sucursal'} · Sin límite de antigüedad</p></div>
      <div className="history-search"><div className="search-field"><Search size={18} /><input aria-label="Buscar en todo el historial" placeholder="Cliente, empleado, sala, producto o folio" maxLength={80} value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} /></div>
        <button type="button" className="button button-outline" disabled={historyLoading} onClick={() => setHistoryRefresh((n) => n + 1)}>Actualizar</button></div>
    </section>
    {historyError ? <Alert>No se pudo cargar el historial: {historyError}</Alert> : historyLoading || query !== debouncedQuery ? <Spinner text="Consultando historial..." /> : history && <>
      <p className="history-count" role="status">{history.total} {history.total === 1 ? 'servicio' : 'servicios'} {query.trim() ? 'encontrados' : 'registrados'} · Más recientes primero</p>
      {history.items.length ? <div className="service-admin-list history-cards">{history.items.map((service) => <article className="surface-card history-service-card" key={service.id}>
        <div className="service-title-row"><div><span className="eyebrow">SERVICIO #{service.id} · RESERVACIÓN #{service.reservationId}</span><h3>{service.clientName}</h3><p>{service.roomName} · {service.branchName}</p><p>{dateLabel(service.dateTime)}</p><p>Atendió: <strong>{service.employeeName}</strong></p></div>
          <div className="service-total"><span>Total de uso</span><strong>{money(service.totalCost)}</strong><div className="table-actions"><button type="button" title="Editar" aria-label={`Editar servicio ${service.id}`} onClick={() => editService(service)}><Edit3 size={17} /></button><button type="button" title="Eliminar" aria-label={`Eliminar servicio ${service.id}`} disabled={busy} onClick={() => remove(service)}><Trash2 size={17} /></button></div></div></div>
        <details className="service-expand"><summary><span><ClipboardList size={19} /> {(service.treatments || []).length} tratamiento(s) · {(service.treatments || []).reduce((count, line) => count + (line.products || []).length, 0)} partidas de productos</span><span className="service-expand-label" /></summary>
          <div className="service-details">{(service.treatments || []).map((line, i) => <div className="service-line" key={i}>
            <div className="service-line-title"><strong>{line.guestName ? `${line.guestName} · ` : ''}{line.name}</strong><b>{money(line.totalCost)}</b></div>
            <ul>{(line.products || []).map((product, j) => <li key={j}>{product.name} · {product.brand} <span>{product.quantity} × {money(product.unitCost)} = {money(product.totalCost)}</span></li>)}</ul>
          </div>)}</div>
        </details>
      </article>)}</div> : <Empty title={query.trim() ? 'No hay coincidencias' : 'Aún no hay servicios registrados'} description={query.trim() ? 'Cambia el texto de búsqueda para consultar otros servicios.' : 'Registra un servicio asociado a una reservación pendiente.'} />}
      {history.pages > 1 && <nav className="history-pagination" aria-label="Páginas del historial">
        <button type="button" className="button button-outline" disabled={history.page <= 1} onClick={() => setPage(history.page - 1)}><ChevronLeft size={18} /> Anterior</button>
        <span>Página {history.page} de {history.pages}</span>
        <button type="button" className="button button-outline" disabled={history.page >= history.pages} onClick={() => setPage(history.page + 1)}>Siguiente <ChevronRight size={18} /></button>
      </nav>}
    </>}

    {edit && <Modal wide title={edit === 'new' ? 'Registrar servicio' : `Editar servicio #${edit.id}`} subtitle="Cada tratamiento incluye al menos un producto utilizado." onClose={() => setEdit(null)}>
      <form onSubmit={save} className="form-stack"><Alert>{error}</Alert>
        <section className="service-form-step">
          <div className="form-step-heading"><span>01</span><div><h3>Datos de la cita</h3><p>Confirma la sala, el horario y el personal responsable.</p></div></div>
          <Field label="Reservación asociada" hint="El personal se carga según la sucursal de esta cita."><select required value={form.reservationId} disabled={edit !== 'new'} onChange={(e) => {
            suggestedFor.current = null;
            setReservationContext(null); setContextError(''); setError('');
            setForm({ ...form, reservationId: e.target.value, employeeId: '', treatments: [newLine()] });
          }}><option value="">{listLoading ? 'Cargando reservaciones…' : 'Elige una reservación pendiente'}</option>
            {availableReservations.map((r) => <option key={r.id} value={r.id}>#{r.id} · {r.clientName} · {r.roomName} · {r.branchName} · {shortDate(r.date)} · {r.scheduleText}</option>)}
            {reservationId > 0 && !availableReservations.some((r) => r.id === reservationId) && <option value={reservationId}>#{reservationId} · {selectedBooking ? `${selectedBooking.clientName} · ${selectedBooking.roomName}` : 'Reservación seleccionada'}</option>}
          </select></Field>
          {edit === 'new' && !reservationId && !listLoading && !availableReservations.length && <p className="field-hint">{listError ? 'No se pudo cargar la lista de reservaciones.' : 'No hay reservaciones pendientes.'} <button type="button" className="text-link" onClick={load}>Actualizar lista</button></p>}
          {selectedBooking && <div className="service-booking-summary">
            <div className="service-booking-title"><span className="eyebrow">RESERVACIÓN #{selectedBooking.id}</span><h3>{selectedBooking.clientName}</h3></div>
            <div><span>Sala</span><strong>{selectedBooking.roomName}</strong></div>
            <div><span>Sucursal</span><strong>{selectedBooking.branchName}</strong></div>
            <div><span>Fecha</span><strong>{shortDate(selectedBooking.date)}</strong></div>
            <div><span>Horario</span><strong>{selectedBooking.scheduleText}</strong></div>
          </div>}
          {bookingUnavailable && <Alert>Esta reservación ya no está pendiente. Selecciona otra para registrar un servicio.</Alert>}
          {contextError && <div><Alert>No fue posible consultar la cita y su personal: {contextError}</Alert><button type="button" className="button button-outline" onClick={() => setContextAttempt((n) => n + 1)}>Reintentar consulta</button></div>}
          <div className="form-grid">
            <Field label="Empleado que brindó el servicio" hint={selectedBooking ? `Personal activo de ${selectedBooking.branchName}` : 'Primero elige una reservación.'}>
              <select required disabled={!contextMatches || contextLoading || !myEmployees.length || Boolean(bookingUnavailable)} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">{contextLoading ? 'Consultando personal…' : !reservationId ? 'Primero elige una reservación' : !contextMatches ? 'Personal no disponible' : !myEmployees.length ? 'Sin empleados activos' : 'Seleccionar empleado'}</option>
                {myEmployees.map((e) => <option key={e.id} value={e.id}>{[e.name, e.lastName, e.secondLastName].filter(Boolean).join(' ')} · {e.position}</option>)}
              </select>
            </Field>
            <Field label="Fecha y hora del servicio"><input required type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} /></Field>
          </div>
          {contextMatches && !contextLoading && !myEmployees.length && <div className="service-no-employees" role="status">
            <strong>No hay empleados activos en {selectedBooking.branchName}.</strong><p>El servicio debe quedar asociado a quien realmente atendió en esa sucursal.</p>
            {identity.user.role === 'ADMIN' ? <p>Revisa la sucursal y el estatus del personal en <Link className="text-link" to="/personal/empleados" target="_blank" rel="noopener">Empleados (abre otra pestaña)</Link>. Después vuelve aquí y actualiza la lista.</p> : <p>Solicita al administrador que revise el personal asignado.</p>}
            <button type="button" className="button button-outline" onClick={() => setContextAttempt((n) => n + 1)}>Actualizar empleados</button>
          </div>}
          {catalogError && <div><Alert>No fue posible cargar tratamientos y productos: {catalogError}</Alert><button type="button" className="button button-outline" onClick={() => setCatalogAttempt((n) => n + 1)}>Reintentar catálogos</button></div>}
          {!catalogReady && !catalogError && <p role="status" className="muted">Cargando tratamientos y productos…</p>}
          {catalogReady && (!treatments.length || !products.length) && <Alert>Para registrar servicios debe existir al menos un tratamiento y un producto activo.</Alert>}
        </section>
        {selectedBooking?.guests?.length > 0 && <div className="guest-prefs-note">
          Asistentes: {selectedBooking.guests.map((guest) => `${guest.name} (${guest.treatmentIds?.length || 0} tratamiento(s) solicitado(s))`).join(' · ')}.
          Puedes ajustar los productos y tratamientos realmente aplicados antes de guardar.
        </div>}
        <div className="form-section-title"><div><span className="eyebrow">DETALLE DEL SERVICIO</span><h3>Tratamientos y productos</h3></div><button type="button" className="button button-outline" onClick={() => setForm({ ...form, treatments: [...form.treatments, newLine()] })}><PlusCircle size={17} /> Agregar tratamiento</button></div>
        {form.treatments.map((line, i) => <div className="treatment-editor" key={i}><div className="treatment-editor-head"><span>TRATAMIENTO {i + 1}</span>{form.treatments.length > 1 && <button type="button" className="icon-button" onClick={() => setForm({ ...form, treatments: form.treatments.filter((_, idx) => idx !== i) })}><X size={18} /></button>}</div>
          {(selectedBooking?.partySize || edit?.partySize || 1) > 1 && <Field label="¿A quién se aplicó?">
            <select value={line.guestIndex || 0} onChange={(e) => updateLine(i, (old) => ({ ...old, guestIndex: Number(e.target.value) }))}>
              {(selectedBooking?.guests || edit?.guests || [{ name: 'Titular' }, { name: 'Acompañante' }]).slice(0, 2).map((guest, index) =>
                <option value={index} key={index}>{guest.name || (index === 0 ? 'Titular' : 'Acompañante')}</option>)}
            </select>
          </Field>}
          <Field label="Tratamiento"><select required value={line.treatmentId} onChange={(e) => updateLine(i, () => {
            const treatment = treatments.find((item) => item.id === Number(e.target.value));
            return {
              guestIndex: line.guestIndex || 0, treatmentId: e.target.value,
              products: treatment?.defaultProducts?.length
                ? treatment.defaultProducts.map((product) => ({ productId: product.productId, quantity: product.quantity }))
                : [{ productId: '', quantity: 1 }],
            };
          })}><option value="">Selecciona un tratamiento</option>{treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          {line.treatmentId && <p className="field-hint">Productos sugeridos cargados. Confirma las cantidades realmente utilizadas o agrega extras.</p>}
          {line.products.map((p, j) => <div className="product-line-editor" key={j}>
            <Field label="Producto utilizado"><select required value={p.productId} onChange={(e) => updateProduct(i, j, { productId: e.target.value })}><option value="">Seleccionar producto</option>{products.map((prod) => <option key={prod.id} value={prod.id}>{prod.name} · {money(prod.usePrice)} · stock: {prod.stock ?? 0}</option>)}</select></Field>
            <Field label="Cantidad"><input type="number" required min="1" max="500" value={p.quantity} onChange={(e) => updateProduct(i, j, { quantity: e.target.value })} /></Field>
            <button type="button" className="icon-button" aria-label="Quitar producto" disabled={line.products.length === 1} onClick={() => updateLine(i, (current) => ({ ...current, products: current.products.filter((_, idx) => idx !== j) }))}><Trash2 size={18} /></button>
          </div>)}
          <button type="button" className="text-link" onClick={() => updateLine(i, (current) => ({ ...current, products: [...current.products, { productId: '', quantity: 1 }] }))}><PlusCircle size={17} /> Agregar producto</button>
          <div className="cost-line">Subtotal del tratamiento <strong>{money(preview.breakdown[i]?.cost)}</strong></div>
        </div>)}
        <div className="cost-total"><span><ReceiptText size={20} /> Costo total del servicio</span><strong>{money(preview.total)}</strong></div>
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEdit(null)}>Cancelar</button><PrimaryButton type="submit" busy={busy} disabled={!canSave}>Guardar servicio</PrimaryButton></div>
      </form>
    </Modal>}
  </div>;
}
