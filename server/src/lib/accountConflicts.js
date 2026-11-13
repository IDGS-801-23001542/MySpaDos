import { col } from './db.js';
import { HttpError } from './http.js';
import { phoneKey } from './accountFields.js';

function optionalExclusion(id) {
  return id == null ? {} : { id: { $ne: id } };
}

// Public registration and profile changes use the same uniqueness rules.
// MongoDB unique indexes are the final guard against concurrent requests.
export async function ensureAccountAvailable(input, { excludeUserId, excludeClientId } = {}) {
  const username = String(input.username || '').trim().toLowerCase();
  const email = String(input.email || '').trim().toLowerCase();

  if (username && await col('users').findOne({
    usernameLower: username, ...optionalExclusion(excludeUserId),
  })) {
    throw new HttpError(409, 'Ese nombre de usuario ya existe. Prueba con otro.');
  }

  if (email && await col('users').findOne({
    emailLower: email, ...optionalExclusion(excludeUserId),
  })) {
    throw new HttpError(409, 'Ese correo electrónico ya está registrado.');
  }

  const phone = phoneKey(input.phone);
  if (phone) {
    // Match both new normalized records and old profiles saved without phoneKey.
    const tenDigits = /^\d{10}$/.test(phone);
    const spacedPattern = tenDigits
      ? new RegExp(`^\\D*(?:52\\D*)?${phone.split('').join('\\D*')}\\D*$`)
      : new RegExp(`^\\D*${phone.split('').join('\\D*')}\\D*$`);
    const match = await col('clients').findOne({
      ...optionalExclusion(excludeClientId),
      $or: [{ phoneKey: phone }, { phone: spacedPattern }],
    });
    if (match) throw new HttpError(409, 'Ese número de teléfono ya está registrado.');
  }
}
