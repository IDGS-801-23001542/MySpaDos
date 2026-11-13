import { useEffect, useMemo, useState } from 'react';
import { Eye, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { PlaceAddressPicker } from '../components/PlaceAddressPicker.jsx';
import { api, money, pretty } from '../lib.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { Alert, Empty, Field, Modal, PageHeader, PrimaryButton, StatusBadge } from '../components/UI.jsx';

const genderOptions = [
  ['MASCULINO', 'Masculino'], ['FEMENINO', 'Femenino'], ['OTRO', 'Otro'],
];
const activeOptions = [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']];

const f = (key, label, type = 'text', options = null, required = true) => ({ key, label, type, options, required });
const person = [
  f('name', 'Nombre'), f('lastName', 'Apellido paterno'),
  f('secondLastName', 'Apellido materno', 'text', null, false),
  f('gender', 'Género', 'select', genderOptions),
  f('rfc', 'RFC', 'text', null, false),
  f('address', 'Domicilio', 'text', null, false),
  f('phone', 'Teléfono', 'tel', null, false),
];
const account = [f('username', 'Nombre de usuario'), f('email', 'Correo electrónico', 'email'), f('password', 'Contraseña', 'password')];

const configs = {
  employees: { title: 'Empleados', singular: 'empleado', caption: 'Tu equipo es el corazón de cada experiencia.', fields: [...person, f('position', 'Puesto'), f('accessRole', 'Permisos de acceso', 'select', [['EMPLEADO', 'Empleado'], ['ADMIN', 'Administrador']]), f('branchId', 'Sucursal', 'branch'), ...account, f('photoUrl', 'Fotografía', 'image', null, false), f('status', 'Estatus', 'select', activeOptions)], columns: ['employeeNumber', 'name', 'lastName', 'position', 'status'] },
  clients: { title: 'Clientes', singular: 'cliente', caption: 'Gestiona a las personas que confían en MySpa2.', fields: [...person, ...account, f('status', 'Estatus', 'select', activeOptions)], columns: ['clientNumber', 'name', 'lastName', 'email', 'status'] },
  products: { title: 'Productos', singular: 'producto', caption: 'Los detalles que acompañan cada ritual.', fields: [f('name', 'Nombre'), f('brand', 'Marca'), f('usePrice', 'Precio por uso', 'number'), f('stock', 'Unidades disponibles', 'number'), f('trackStock', 'Descontar unidades al realizar un servicio', 'checkbox', null, false), f('minStock', 'Alerta de stock mínimo', 'number'), f('status', 'Estatus', 'select', activeOptions)], columns: ['name', 'brand', 'usePrice', 'stock', 'trackStock', 'minStock', 'status'] },
  branches: { title: 'Sucursales', singular: 'sucursal', caption: 'Los lugares donde comienza la calma.', fields: [f('name', 'Nombre'), f('address', 'Domicilio', 'text', null, false), f('stateName', 'Estado', 'text', null, false), f('municipality', 'Municipio / Ciudad', 'text', null, false), f('postalCode', 'Código postal', 'text', null, false), f('latitude', 'Latitud', 'number'), f('longitude', 'Longitud', 'number'), f('status', 'Estatus', 'select', activeOptions)], columns: ['name', 'address', 'municipality', 'stateName', 'postalCode', 'status'] },
  rooms: { title: 'Salas de spa', singular: 'sala', caption: 'Espacios para desconectar y cuidar de ti.', fields: [f('name', 'Nombre'), f('description', 'Descripción', 'textarea'), f('branchId', 'Sucursal', 'branch'), f('capacity', 'Capacidad máxima (1 o 2 personas)', 'number'), f('photoUrl', 'Fotografía', 'image', null, false), f('status', 'Estatus', 'select', activeOptions)], columns: ['name', 'branchId', 'capacity', 'description', 'status'] },
  schedules: { title: 'Horarios', singular: 'horario', caption: 'Organiza los intervalos de atención.', fields: [f('start', 'Hora de inicio', 'time'), f('end', 'Hora de término', 'time')], columns: ['start', 'end'] },
  treatments: { title: 'Tratamientos', singular: 'tratamiento', caption: 'Elige las experiencias que transforman cada visita.', fields: [f('name', 'Nombre'), f('description', 'Descripción', 'textarea'), f('defaultProducts', 'Productos sugeridos', 'recipe', null, false), f('status', 'Estatus', 'select', activeOptions)], columns: ['name', 'description', 'status'] },
};

function emptyValues(config) {
  const object = {};
  for (const field of config.fields) object[field.key] = field.key === 'status' ? 'ACTIVO' : field.key === 'gender' ? 'FEMENINO' : field.key === 'accessRole' ? 'EMPLEADO' : field.type === 'recipe' ? [] : field.key === 'capacity' ? 1 : field.key === 'trackStock' ? true : field.key === 'stock' ? 0 : field.key === 'minStock' ? 5 : '';
  return object;
}

function shorten(value) {
  if (value === null || value === undefined) return '—';
  return String(value).length > 85 ? `${String(value).slice(0, 82)}...` : value;
}


export default function CatalogPage({ resource }) {
  const config = configs[resource];
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const debouncedQuery = useDebounce(q);
  const [status, setStatus] = useState('ACTIVO');
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const [restock, setRestock] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockError, setRestockError] = useState('');
  const [form, setForm] = useState(emptyValues(config));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const query = new URLSearchParams();
    if (debouncedQuery) query.set('q', debouncedQuery);
    if (status) query.set('status', status);
    try { setItems(await api(`/manage/${resource}?${query}`)); }
    catch (e) { setError(e.message); }
  }

  useEffect(() => { setQ(''); setStatus('ACTIVO'); setItems([]); setError(''); }, [resource]);
  useEffect(() => { load(); }, [resource, debouncedQuery, status]);
  useEffect(() => {
    api('/manage/branches').then(setBranches).catch(() => {});
    api('/manage/products?status=ACTIVO').then(setProducts).catch(() => {});
  }, []);
  const branchNames = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  function openNew() { setEdit('new'); setForm(emptyValues(config)); setError(''); }
  function openEdit(record) {
    setEdit(record);
    const result = emptyValues(config);
    for (const field of config.fields) if (record[field.key] !== undefined) result[field.key] = record[field.key];
    if (resource === 'employees') result.accessRole = record.accessRole || 'EMPLEADO';
    result.password = '';
    setForm(result); setError('');
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRecipe(index, changes) {
    setForm((current) => ({
      ...current,
      defaultProducts: current.defaultProducts.map((item, i) => i === index ? { ...item, ...changes } : item),
    }));
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    const payload = { ...form };
    if (edit !== 'new' && !payload.password) delete payload.password;
    if (resource === 'schedules') delete payload.status;
    try {
      await api(edit === 'new' ? `/manage/${resource}` : `/manage/${resource}/${edit.id}`, {
        method: edit === 'new' ? 'POST' : 'PATCH', body: payload,
      });
      setMessage(edit === 'new' ? 'Registro creado correctamente.' : 'Cambios guardados correctamente.');
      setEdit(null); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function openRestock(product) {
    setRestock(product);
    setRestockQuantity('');
    setRestockError('');
    setMessage('');
  }

  async function addStock(event) {
    event.preventDefault();
    if (!restock || !Number.isSafeInteger(Number(restockQuantity)) || Number(restockQuantity) < 1) {
      setRestockError('Introduce una cantidad entera mayor que cero.');
      return;
    }
    setBusy(true);
    setRestockError('');
    try {
      const product = await api(`/manage/products/${restock.id}/restock`, {
        method: 'POST',
        body: { quantity: Number(restockQuantity) },
      });
      await load();
      setRestock(null);
      setMessage(`Se agregaron ${restockQuantity} unidades a ${product.name}. Nueva existencia: ${product.stock}.`);
    } catch (failure) {
      setRestockError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    const info = resource === 'schedules' ? 'Se eliminará definitivamente el horario.' : 'El registro quedará INACTIVO, sin borrarse del historial.';
    if (!window.confirm(`¿Continuar con ${item.name || item.start}?\n${info}`)) return;
    setBusy(true); setError('');
    try { await api(`/manage/${resource}/${item.id}`, { method: 'DELETE' }); await load(); setMessage('Operación completada.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const labels = Object.fromEntries(config.fields.map((field) => [field.key, field.label]));
  return <div className="staff-view">
    <PageHeader eyebrow="GESTIÓN DE CATÁLOGOS" title={config.title} subtitle={config.caption} actions={<button className="button button-primary" onClick={openNew}><Plus size={18} /> Nuevo {config.singular}</button>} />
    <div className="surface-card table-shell"><div className="table-toolbar">
      <div className="search-field"><Search size={18} /><input aria-label="Buscar registros" value={q} placeholder={`Buscar ${config.title.toLowerCase()}...`} onChange={(e) => setQ(e.target.value)} /></div>
      {resource !== 'schedules' && <select aria-label="Filtrar estatus" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select>}
    </div><Alert>{error}</Alert>{message && <Alert type="success">{message}</Alert>}
      {resource === 'products' && (
        <p className="inventory-note">
          Para recibir unidades nuevas utiliza <strong>Agregar existencias</strong>.
          El sistema sumará la cantidad recibida al stock actual; los consumibles
          también se descuentan al registrar servicios.
        </p>
      )}
      {items.length ? <div className="table-responsive"><table className="data-table"><thead><tr>{config.columns.map((key) => <th key={key}>{labels[key] || pretty(key)}</th>)}<th>Acciones</th></tr></thead><tbody>
        {items.map((record) => <tr key={record.id}>{config.columns.map((key) => <td key={key}>{key === 'status' ? <StatusBadge value={record.status} />
          : key === 'branchId' ? branchNames.get(record.branchId) || `#${record.branchId}`
          : key === 'usePrice' ? money(record.usePrice)
          : key === 'trackStock' ? (record.trackStock === false ? 'Reutilizable' : 'Consumible')
          : key === 'stock' ? <span className={Number(record.stock || 0) <= Number(record.minStock || 0) ? 'stock-low' : 'stock-ok'}>
            {record.stock ?? 0} {Number(record.stock || 0) <= Number(record.minStock || 0) ? '· Reponer' : ''}
          </span> : shorten(record[key])}</td>)}
          <td>
            <div className="table-actions">
              {resource === 'products' && record.status === 'ACTIVO' && (
                <button
                  type="button"
                  className="inventory-add-button"
                  title="Agregar más unidades al inventario"
                  aria-label={`Agregar existencias de ${record.name}`}
                  onClick={() => openRestock(record)}
                >
                  <Plus size={16} /> Agregar existencias
                </button>
              )}
              <button title="Detalles" aria-label="Ver detalles" onClick={() => setView(record)}><Eye size={17} /></button>
              <button title="Editar" aria-label="Editar" onClick={() => openEdit(record)}><Pencil size={17} /></button>
              <button title="Eliminar" aria-label="Eliminar" disabled={busy || record.status === 'INACTIVO'} onClick={() => remove(record)}><Trash2 size={17} /></button>
            </div>
          </td>
        </tr>)}
      </tbody></table></div> : <Empty title="No hay registros para mostrar" description="Crea el primer registro o cambia la búsqueda." />}
    </div>
    {edit && <Modal wide title={edit === 'new' ? `Nuevo ${config.singular}` : `Editar ${config.singular}`} subtitle="Los campos marcados con * son obligatorios." onClose={() => setEdit(null)}>
      <form className="form-grid" onSubmit={save}><div className="field-full"><Alert>{error}</Alert></div>
        {resource === 'branches' && <PlaceAddressPicker onSelect={(place) => {
          setForm((previous) => ({ ...previous, ...Object.fromEntries(
            Object.entries(place).filter(([, value]) => value !== null && value !== undefined),
          ) }));
        }} />}
        {resource === 'products' && edit !== 'new' && (
          <div className="field-full myspa-offline-note">
            Existencias actuales: <strong>{edit.stock ?? 0}</strong>.
            Para añadir unidades, guarda este formulario y utiliza <strong>Agregar existencias</strong>.
          </div>
        )}
        {config.fields
          .filter((field) => !(resource === 'products' && edit !== 'new' && field.key === 'stock'))
          .map((field) => <Field key={field.key} label={`${field.label}${field.required && !(field.type === 'password' && edit !== 'new') ? ' *' : ''}`} full={['textarea', 'image', 'recipe'].includes(field.type)}>
          {field.type === 'select' ? <select required={field.required} value={form[field.key] ?? ''} onChange={(e) => update(field.key, e.target.value)}>{field.options.map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select>
            : field.type === 'branch' ? <select required value={form[field.key] || ''} onChange={(e) => update(field.key, e.target.value)}><option value="">Selecciona una sucursal</option>{branches.filter((b) => b.status === 'ACTIVO').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              : field.type === 'recipe' ? <div className="recipe-editor">
                <p>Al elegir este tratamiento en Servicios se propondrán automáticamente estos productos. El personal podrá ajustar cantidades y agregar otros.</p>
                {(form.defaultProducts || []).map((entry, index) => <div className="recipe-row" key={index}>
                  <select aria-label={`Producto sugerido ${index + 1}`} required value={entry.productId || ''} onChange={(e) => updateRecipe(index, { productId: e.target.value })}>
                    <option value="">Elegir producto</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.usePrice)}</option>)}
                  </select>
                  <input type="number" aria-label={`Cantidad sugerida ${index + 1}`} min="1" max="500" required value={entry.quantity} onChange={(e) => updateRecipe(index, { quantity: e.target.value })} />
                  <button type="button" className="icon-button" aria-label="Quitar producto sugerido" onClick={() => update('defaultProducts', form.defaultProducts.filter((_, i) => i !== index))}><X size={17} /></button>
                </div>)}
                <button type="button" className="button button-outline" onClick={() => update('defaultProducts', [...(form.defaultProducts || []), { productId: '', quantity: 1 }])}><Plus size={16} /> Agregar producto habitual</button>
              </div>
              : field.type === 'checkbox' ? <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => update(field.key, e.target.checked)} />
              : field.type === 'textarea' ? <textarea required={field.required} rows={3} value={form[field.key] || ''} onChange={(e) => update(field.key, e.target.value)} />
                : field.type === 'image' ? <ImageUpload value={form[field.key]} onChange={(url) => update(field.key, url)} label="Subir fotografía" />
                  : <input type={field.type} step={field.type === 'number' ? 'any' : undefined} required={field.required && !(field.type === 'password' && edit !== 'new')} minLength={field.type === 'password' ? 10 : undefined} value={form[field.key] ?? ''} onChange={(e) => update(field.key, e.target.value)} placeholder={field.type === 'password' && edit !== 'new' ? 'Dejar vacío para conservar' : ''} />}
        </Field>)}
        <div className="modal-actions field-full"><button type="button" className="button button-outline" onClick={() => setEdit(null)}>Cancelar</button><PrimaryButton type="submit" busy={busy}>Guardar {config.singular}</PrimaryButton></div>
      </form>
    </Modal>}
    {restock && (
      <Modal
        title={`Agregar existencias · ${restock.name}`}
        subtitle="Registra únicamente las unidades nuevas que recibiste."
        onClose={() => { if (!busy) setRestock(null); }}
      >
        <form className="inventory-restock-form" onSubmit={addStock}>
          <Alert>{restockError}</Alert>
          <Field label="Unidades recibidas">
            <input
              type="number"
              min="1"
              max="1000000"
              step="1"
              required
              autoFocus
              value={restockQuantity}
              onChange={(event) => setRestockQuantity(event.target.value)}
              placeholder="Ej. 15"
            />
          </Field>
          <div className="inventory-restock-summary">
            <span>Existencia actual: {restock.stock ?? 0}</span>
            <span>Unidades por agregar: +{Number(restockQuantity) || 0}</span>
            <strong>Nueva existencia: {Number(restock.stock || 0) + (Number(restockQuantity) || 0)}</strong>
          </div>
          <div className="modal-actions">
            <button type="button" className="button button-outline" disabled={busy} onClick={() => setRestock(null)}>
              Cancelar
            </button>
            <PrimaryButton
              type="submit"
              busy={busy}
              disabled={!Number.isSafeInteger(Number(restockQuantity)) || Number(restockQuantity) < 1 ||
                Number(restock.stock || 0) + Number(restockQuantity) > 1000000}
            >
              Agregar unidades
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    )}
    {view && <Modal wide title={`Detalle de ${config.singular}`} onClose={() => setView(null)}>
      {['employees', 'clients'].includes(resource) ? (
        <div className="person-detail-heading">
          <ProfileAvatar
            className="person-detail-avatar"
            photoUrl={view.photoUrl}
            name={[view.name, view.lastName].filter(Boolean).join(' ') || 'persona'}
            iconSize={52}
          />
          <div>
            <h3>{[view.name, view.lastName, view.secondLastName].filter(Boolean).join(' ')}</h3>
            <p>{resource === 'employees' ? 'Fotografía del personal' : 'Fotografía del cliente'}</p>
          </div>
        </div>
      ) : view.photoUrl ? (
        <div className="detail-hero-photo">
          <img src={view.photoUrl} alt={`Fotografía de ${view.name}`} />
        </div>
      ) : null}
      <div className="detail-list">{Object.entries(view).filter(([key]) => !['_id', 'passwordHash', 'photoUrl'].includes(key)).map(([key, value]) => <div key={key}><strong>{labels[key] || pretty(key)}</strong><span>{key === 'status' ? <StatusBadge value={value} />
                  : key === 'photoUrl' ? (value ? <img className="detail-photo" src={value} alt={`Fotografía de ${view.name || 'registro'}`} /> : 'Sin fotografía')
                  : key === 'defaultProducts' ? (value?.length ? value.map((entry) => `${products.find((product) => product.id === Number(entry.productId))?.name || `Producto #${entry.productId}`} × ${entry.quantity}`).join(', ') : 'Sin productos predeterminados')
                  : String(value ?? '—')}</span></div>)}</div>
      {resource === 'branches' && <div className="map-frame"><iframe title="Localización en Google Maps" loading="lazy" src={`https://maps.google.com/maps?q=${view.latitude},${view.longitude}&z=14&output=embed`} /></div>}
    </Modal>}
  </div>;
}
