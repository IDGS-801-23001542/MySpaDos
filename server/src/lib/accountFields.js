// Normalize Mexican 10-digit phones consistently; allow the +52 country prefix.
export function phoneKey(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return /^52\d{10}$/.test(digits) ? digits.slice(2) : digits;
}

export function duplicateFieldMessage(error) {
  if (error?.code !== 11000) return null;
  const fields = error.keyPattern || {};
  const detail = String(error.message || '');
  if (fields.usernameLower || detail.includes('usernameLower')) {
    return 'Ese nombre de usuario ya existe. Prueba con otro.';
  }
  if (fields.emailLower || detail.includes('emailLower')) {
    return 'Ese correo electrónico ya está registrado.';
  }
  if (fields.phoneKey || detail.includes('phoneKey')) {
    return 'Ese número de teléfono ya está registrado.';
  }
  return 'Ya existe un registro con esos datos. Revisa usuario, correo y teléfono.';
}
