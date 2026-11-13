import { z } from 'zod';
import { trim, optional, personGender, rfcSchema, price, safeId, state } from './http.js';
import { passwordField, usernameField, emailField } from './security.js';

const photoPath = z.string().trim().max(250).refine(
  (value) => value === '' || /^\/api\/media\/[a-f\d]{24}$/.test(value),
  'La fotografía debe subirse desde MySpa2',
).optional().default('');

const roomPhotoPath = z.string().trim().max(250).refine(
  (value) => value === '' || /^\/api\/media\/[a-f\d]{24}$/.test(value) ||
    /^\/rooms\/(lavanda|olivo|loto|bambu|salvia|arena|niebla)\.webp$/.test(value),
  'Selecciona una fotografía subida a MySpa2 o una imagen de su catálogo',
).optional().default('');

const person = {
  name: trim(80),
  lastName: trim(80),
  secondLastName: optional(80),
  gender: personGender,
  rfc: rfcSchema.default(''),
  address: optional(250),
  phone: optional(25),
  photoUrl: photoPath,
};

export const employeeSchema = z.object({
  ...person,
  rfc: rfcSchema.refine((v) => /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{0,3}$/.test(v), 'RFC personal de 4 letras requerido'),
  position: trim(100),
  branchId: safeId,
  username: usernameField,
  email: emailField,
  password: passwordField.optional(),
  accessRole: z.enum(['ADMIN', 'EMPLEADO']).default('EMPLEADO'),
  status: state,
}).strict();

export const clientSchema = z.object({
  ...person,
  email: emailField,
  username: usernameField,
  password: passwordField.optional(),
  status: state,
}).strict();

export const registerSchema = clientSchema.omit({ status: true, photoUrl: true }).extend({ password: passwordField });
export const productSchema = z.object({
  name: trim(120), brand: trim(120), usePrice: price,
  stock: z.coerce.number().int().min(0).max(1000000).default(0),
  trackStock: z.boolean().default(true),
  minStock: z.coerce.number().int().min(0).max(1000000).default(5),
  status: state,
}).strict();
export const branchSchema = z.object({
  name: trim(120), address: optional(220), latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  stateName: optional(100).default(''), municipality: optional(100).default(''),
  postalCode: z.string().trim().regex(/^$|^[0-9A-Za-z -]{3,12}$/).default(''),
  countryCode: z.string().trim().regex(/^$|^[A-Z]{2}$/).default(''),
  googlePlaceId: optional(220).default(''),
  status: state,
}).strict();
export const roomSchema = z.object({
  name: trim(120), description: trim(1200), photoUrl: roomPhotoPath,
  branchId: safeId, capacity: z.coerce.number().int().min(1).max(2).default(1), status: state,
}).strict();
export const scheduleSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).strict().refine((value) => value.start < value.end, 'La hora final debe ser posterior a la inicial');
export const treatmentSchema = z.object({
  name: trim(120), description: trim(1200), status: state,
  defaultProducts: z.array(z.object({
    productId: safeId,
    quantity: z.coerce.number().int().min(1).max(500),
  }).strict()).max(25).default([]),
}).strict();
