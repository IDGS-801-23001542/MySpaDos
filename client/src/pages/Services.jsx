import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Edit3, Plus, PlusCircle, ReceiptText, Search, Trash2, X } from 'lucide-react';
import { api, dateLabel, money, shortDate, localDateTimeInput } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { Alert, Empty, Field, Modal, PageHeader, PrimaryButton } from '../components/UI.jsx';

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
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(base);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [services, allReservations] = await Promise.all([api('/services'), api('/reservations')]);
      setItems(services);
      setReservations(allReservations);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => {
    load();
    api('/manage/employees?status=ACTIVO').then(setEmployees).catch(() => {});
    api('/manage/products?status=ACTIVO').then(setProducts).catch(() => {});
    api('/manage/treatments?status=ACTIVO').then(setTreatments).catch(() => {});
  }, []);

  const selectedBooking = reservations.find((r) => r.id === Number(form.reservationId));
  const myEmployees = employees.filter((employee) =>
    employee.branchId === (selectedBooking?.branchId || identity.profile.branchId));
  const availableReservations = reservations.filter((r) => r.status === 'PENDIENTE');

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
    setEdit('new'); setError('');
    setForm({ ...base, employeeId: identity.profile.id,
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
    event.preventDefault(); setBusy(true); setError('');
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
  const visible = items.filter((service) => {
    const text = [service.id, service.reservationId, service.clientName, service.employeeName, service.roomName, service.totalCost, service.dateTime,
      ...service.treatments.flatMap((line) => [line.name, line.guestName, line.totalCost, ...line.products.map((product) => product.name)])].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  });
  return <div className="staff-view">
    <PageHeader eyebrow="EXPERIENCIAS REALIZADAS" title="Servicios" subtitle="Después de atender una reservación, registra quién la atendió, los tratamientos y los productos que realmente se usaron." actions={<button className="button button-primary" onClick={newService}><Plus size={18} /> Registrar servicio</button>} />
    <Alert>{error}</Alert>{message && <Alert type="success">{message}</Alert>}
    <div className="service-guide" aria-label="Cómo registrar un servicio">
      <span><b>1</b> Elegir reservación pendiente</span>
      <span><b>2</b> Seleccionar tratamiento y ajustar productos</span>
      <span><b>3</b> Revisar costos y guardar</span>
    </div>
    <div className="service-search"><div className="search-field"><Search size={18} /><input aria-label="Buscar servicios" placeholder="Buscar cliente, tratamiento, producto o folio" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>
    {visible.length ? <div className="service-admin-list">{visible.map((service) => <article className="surface-card" key={service.id}>
      <div className="service-title-row"><div><span className="eyebrow">SERVICIO #{service.id}</span><h3>{service.clientName}</h3><p>{service.roomName} · {dateLabel(service.dateTime)}</p><p>Atendió: {service.employeeName}</p></div>
        <div className="service-total"><span>Total de uso</span><strong>{money(service.totalCost)}</strong><div className="table-actions"><button title="Editar" onClick={() => editService(service)}><Edit3 size={17} /></button><button title="Eliminar" disabled={busy} onClick={() => remove(service)}><Trash2 size={17} /></button></div></div></div>
      <div className="service-details">{service.treatments.map((line, i) => <div className="service-line" key={i}>
        <div className="service-line-title"><strong>{line.guestName ? `${line.guestName} · ` : ''}{line.name}</strong><b>{money(line.totalCost)}</b></div>
        <ul>{line.products.map((product, j) => <li key={j}>{product.name} · {product.brand} <span>{product.quantity} × {money(product.unitCost)} = {money(product.totalCost)}</span></li>)}</ul>
      </div>)}</div>
    </article>)}</div> : <Empty title="Aún no hay servicios registrados" description="Registra un servicio asociado a una reservación pendiente." />}

    {edit && <Modal wide title={edit === 'new' ? 'Registrar servicio' : `Editar servicio #${edit.id}`} subtitle="Cada tratamiento incluye al menos un producto utilizado." onClose={() => setEdit(null)}>
      <form onSubmit={save} className="form-stack"><Alert>{error}</Alert>
        <div className="form-grid">
          <Field label="Reservación asociada"><select required value={form.reservationId} disabled={edit !== 'new'} onChange={(e) => {
            const booking = reservations.find((item) => item.id === Number(e.target.value));
            setForm({ ...form, reservationId: e.target.value, employeeId: '', treatments: suggestedLines(booking, treatments) });
          }}><option value="">Elige una reservación pendiente</option>
            {availableReservations.map((r) => <option key={r.id} value={r.id}>#{r.id} · {r.clientName} · {r.roomName} · {shortDate(r.date)}</option>)}
            {edit !== 'new' && <option value={edit.reservationId}>#{edit.reservationId} · {edit.clientName}</option>}
          </select></Field>
          <Field label="Empleado que brindó el servicio"><select required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Seleccionar empleado</option>
            {myEmployees.map((e) => <option key={e.id} value={e.id}>{e.name} {e.lastName} · {e.position}</option>)}
          </select></Field>
          <Field label="Fecha y hora del servicio"><input required type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} /></Field>
        </div>
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
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEdit(null)}>Cancelar</button><PrimaryButton type="submit" busy={busy}>Guardar servicio</PrimaryButton></div>
      </form>
    </Modal>}
  </div>;
}
