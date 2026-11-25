import crypto from 'node:crypto';

const VALID_FOR_MS = 20 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/;

// Dedicado: nunca depender de la contraseña SMTP ni de la URI de Atlas.
export function resetTokenReady() {
  return (process.env.RESET_TOKEN_SECRET || '').length >= 32;
}

function signature(body, passwordHash) {
  const key = process.env.RESET_TOKEN_SECRET;
  if (!key || key.length < 32) throw new Error('Falta RESET_TOKEN_SECRET (mínimo 32 caracteres) en .env');
  // Al cambiar passwordHash, TODOS los enlaces anteriores dejan de ser válidos.
  return crypto.createHmac('sha256', key).update(`${body}.${passwordHash}`).digest('hex');
}

export function makePasswordResetToken(user, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({
    uid: user.id, exp: now + VALID_FOR_MS, nonce: crypto.randomBytes(16).toString('hex'),
  })).toString('base64url');
  return `${body}.${signature(body, user.passwordHash)}`;
}

export function parsePasswordResetToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1000 || !TOKEN_PATTERN.test(token)) return null;
  try {
    const [body, provided] = token.split('.');
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(data.uid) || data.uid <= 0 || !Number.isSafeInteger(data.exp)
      || data.exp <= now || data.exp > now + VALID_FOR_MS || !/^[a-f0-9]{32}$/.test(data.nonce)) return null;
    return { body, signature: provided, uid: data.uid };
  } catch { return null; }
}

export function verifyPasswordResetToken(token, user, now = Date.now()) {
  if (!user || user.status !== 'ACTIVO') return false;
  const parsed = parsePasswordResetToken(token, now);
  if (!parsed || parsed.uid !== user.id) return false;
  const expected = Buffer.from(signature(parsed.body, user.passwordHash), 'hex');
  const received = Buffer.from(parsed.signature, 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
