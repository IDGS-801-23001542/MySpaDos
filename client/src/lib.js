let csrfToken = '';

export function setCsrf(value = '') {
  csrfToken = value;
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method) && !navigator.onLine) {
    throw new Error('Esta operación requiere internet. No se guardaron cambios sin conexión.');
  }
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;
  if (options.body && !isForm) headers['Content-Type'] = 'application/json';
  if (csrfToken && !['GET', 'HEAD'].includes(options.method || 'GET')) {
    headers['x-csrf-token'] = csrfToken;
  }
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers,
      body: isForm || typeof options.body === 'string' ? options.body
        : options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Comprueba que MySpa2 esté encendido.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Error ${response.status}`);
  return Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

export function money(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function dateLabel(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
}

export function shortDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

export function pretty(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replaceAll('_', ' ').toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (match) => match.toUpperCase());
}

export function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export function localDateTimeInput(value = new Date()) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
