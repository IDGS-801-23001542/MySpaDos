import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { col, nextId } from './db.js';
import { assert, HttpError, publicRecord, route } from './http.js';
import { config } from './config.js';

const DURATION = 7 * 24 * 60 * 60 * 1000;
export const passwordField = z.string().min(10).max(128)
  .regex(/[a-z]/, 'Necesita una minúscula')
  .regex(/[A-Z]/, 'Necesita una mayúscula')
  .regex(/[0-9]/, 'Necesita un número');
export const usernameField = z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9._-]+$/, 'Usa letras, números, puntos o guiones');
export const emailField = z.string().trim().email().max(254).transform((v) => v.toLowerCase());

export const hashPassword = (value) => bcrypt.hash(value, 12);
export const verifyPassword = (value, hash) => bcrypt.compare(value, hash);
export const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex');

export async function createAccount({ username, email, password, role, status = 'ACTIVO', session }) {
  const userId = await nextId('users', session);
  const user = {
    id: userId,
    username,
    usernameLower: username.toLowerCase(),
    emailLower: email?.toLowerCase() || undefined,
    role,
    status,
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
  };
  try {
    await col('users').insertOne(user, session ? { session } : {});
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'El nombre de usuario o correo ya está registrado');
    throw error;
  }
  return userId;
}

export async function startSession(res, user) {
  const token = newToken();
  const csrf = newToken();
  const expiresAt = new Date(Date.now() + DURATION);
  await col('sessions').insertOne({
    id: await nextId('sessions'), userId: user.id, tokenHash: hashToken(token),
    csrf, expiresAt, createdAt: new Date(),
  });
  res.cookie('myspa2_sid', token, {
    httpOnly: true, secure: config.production,
    sameSite: 'lax', path: '/', expires: expiresAt,
  });
  return csrf;
}

export const authenticate = route(async (req, res, next) => {
  const raw = req.cookies?.myspa2_sid;
  if (raw) {
    const session = await col('sessions').findOne({ tokenHash: hashToken(raw), expiresAt: { $gt: new Date() } });
    if (session) {
      const user = await col('users').findOne({ id: session.userId, status: 'ACTIVO' });
      if (user) {
        req.user = user;
        req.session = session;
        req.csrf = session.csrf;
      }
    }
  }
  next();
});

export function requireUser(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Inicia sesión para continuar'));
  next();
}

export function isStaff(user) {
  return ['ADMIN', 'EMPLEADO'].includes(user?.role);
}

export function requireEmployee(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión'));
  if (!isStaff(req.user)) return next(new HttpError(403, 'Acceso exclusivo para personal'));
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión'));
  if (req.user.role !== 'ADMIN') return next(new HttpError(403, 'Operación exclusiva de administración'));
  next();
}


export function requireClient(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión'));
  if (req.user.role !== 'CLIENTE') return next(new HttpError(403, 'Acceso exclusivo para clientes'));
  next();
}

export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) {
    return next(new HttpError(403, 'Origen no autorizado'));
  }
  // Anonymous login and registration do not have a session to protect.
  if (!req.user) return next();
  if (req.get('x-csrf-token') !== req.csrf) {
    return next(new HttpError(403, 'La sesión expiró. Recarga la página e inténtalo nuevamente.'));
  }
  next();
}

export async function revokeUserSessions(userId, session) {
  await col('sessions').deleteMany({ userId }, session ? { session } : {});
}

export async function currentIdentity(req) {
  if (!req.user) return null;
  const identity = isStaff(req.user)
    ? await col('employees').findOne({ userId: req.user.id })
    : await col('clients').findOne({ userId: req.user.id });
  return {
    user: publicRecord(req.user),
    profile: publicRecord(identity),
    csrf: req.csrf,
  };
}

export function assertSameBranch(employee, branchId, user) {
  assert(employee && (user?.role === 'ADMIN' || employee.branchId === branchId),
    403, 'Solo el personal autorizado de esta sucursal puede gestionar la operación');
}

