import { z } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const route = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function assert(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(422, `${issue.path.join('.') || 'Dato'}: ${issue.message}`);
  }
  return result.data;
}

export function idParam(value) {
  const id = Number(value);
  assert(Number.isSafeInteger(id) && id > 0, 400, 'Identificador inválido');
  return id;
}

export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(value) {
  const query = String(value || '').trim().slice(0, 80);
  return query ? new RegExp(escapeRegex(query), 'i') : null;
}

export const trim = (max = 160) => z.string().trim().min(1).max(max);
export const optional = (max = 160) => z.string().trim().max(max).optional().default('');
export const state = z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO');
export const personGender = z.enum(['MASCULINO', 'FEMENINO', 'OTRO']);
export const rfcSchema = z.string().trim().toUpperCase().regex(/^$|^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{0,3}$/, 'RFC inválido');
export const price = z.coerce.number().finite().min(0).max(1000000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
    'El precio debe tener máximo dos decimales');
export const safeId = z.coerce.number().int().positive();

export function publicRecord(record) {
  if (!record) return null;
  const { _id, passwordHash, tokenHash, phoneKey, ...safe } = record;
  return safe;
}

export function utcToday() {
  return new Date().toISOString().slice(0, 10);
}
