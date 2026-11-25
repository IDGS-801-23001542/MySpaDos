import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { col, nextId, inTransaction } from '../lib/db.js';
import { route, validate, assert, HttpError, publicRecord } from '../lib/http.js';
import { createAccount, currentIdentity, emailField, hashPassword, hashToken, newToken, passwordField, usernameField, requireUser, revokeUserSessions, startSession, verifyPassword, isStaff } from '../lib/security.js';
import { registerSchema } from '../lib/validation.js';
import { personGender, rfcSchema } from '../lib/http.js';
import { generateClientNumber } from '../lib/numbers.js';
import { config } from '../lib/config.js';
import { emailReady, sendMail } from '../lib/mailer.js';
import { ensureAccountAvailable } from '../lib/accountConflicts.js';
import { phoneKey, duplicateFieldMessage } from '../lib/accountFields.js';
import { makePasswordResetToken, resetTokenReady, parsePasswordResetToken, verifyPasswordResetToken } from '../lib/resetTokens.js';

const router = Router();

router.get('/me', route(async (req, res) => {
  res.json({ data: await currentIdentity(req) });
}));

router.post('/register', route(async (req, res) => {
  const data = validate(registerSchema, req.body);
  await ensureAccountAvailable(data);
  let result;
  try {
    result = await inTransaction(async (session) => {
      const userId = await createAccount({ ...data, role: 'CLIENTE', session });
      const client = {
        ...data,
        ...(phoneKey(data.phone) ? { phoneKey: phoneKey(data.phone) } : {}),
        id: await nextId('clients', session),
        userId,
        clientNumber: await generateClientNumber(data, session),
        photoUrl: '',
        status: 'ACTIVO',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      delete client.password;
      await col('clients').insertOne(client, { session });
      return { userId, client };
    });
  } catch (error) {
    const message = duplicateFieldMessage(error);
    if (message) throw new HttpError(409, message);
    throw error;
  }
  const { userId, client } = result;
  const user = await col('users').findOne({ id: userId });
  const csrf = await startSession(res, user);
  res.status(201).json({ data: { user: publicRecord(user), profile: publicRecord(client), csrf } });
}));

router.post('/login', route(async (req, res) => {
  const input = validate(z.object({ login: z.string().trim().min(1), password: z.string().min(1) }), req.body);
  const user = await col('users').findOne({
    $or: [{ usernameLower: input.login.toLowerCase() }, { emailLower: input.login.toLowerCase() }],
  });
  if (!user || user.status !== 'ACTIVO' || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }
  const csrf = await startSession(res, user);
  const identity = isStaff(user)
    ? await col('employees').findOne({ userId: user.id })
    : await col('clients').findOne({ userId: user.id });
  res.json({ data: { user: publicRecord(user), profile: publicRecord(identity), csrf } });
}));

router.post('/logout', route(async (req, res) => {
  if (req.session) await col('sessions').deleteOne({ _id: req.session._id });
  res.clearCookie('myspa2_sid', { path: '/' });
  res.json({ message: 'Sesión cerrada' });
}));

router.patch('/profile', requireUser, route(async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    secondLastName: z.string().trim().max(80).default(''),
    gender: personGender,
    rfc: rfcSchema,
    address: z.string().trim().max(250).default(''),
    phone: z.string().trim().max(25).default(''),
    email: emailField,
    username: usernameField,
    photoUrl: z.string().trim().regex(/^\/api\/media\/[a-f0-9]{24}$/).or(z.literal('')).optional(),
  });
  const data = validate(schema, req.body);
  if (data.photoUrl) {
    const current = await col(isStaff(req.user) ? 'employees' : 'clients')
      .findOne({ userId: req.user.id });
    if (data.photoUrl !== current?.photoUrl) {
      const id = data.photoUrl.split('/').pop();
      assert(await col('media').findOne({
        _id: new ObjectId(id),
        ownerUserId: req.user.id,
      }), 403, 'Selecciona una fotografía que hayas subido desde tu cuenta');
    }
  }
  const collection = isStaff(req.user) ? 'employees' : 'clients';
  const currentProfile = await col(collection).findOne({ userId: req.user.id });
  await ensureAccountAvailable(collection === 'clients' ? data : { ...data, phone: '' }, {
    excludeUserId: req.user.id,
    excludeClientId: collection === 'clients' ? currentProfile?.id : undefined,
  });
  const userPatch = {
    username: data.username,
    usernameLower: data.username.toLowerCase(),
    emailLower: data.email,
  };
  try {
    await inTransaction(async (session) => {
      await col('users').updateOne({ id: req.user.id }, { $set: userPatch }, { session });
      const normalizedPhone = collection === 'clients' ? phoneKey(data.phone) : '';
      const profileUpdate = { $set: {
        ...data,
        ...(collection === 'clients' && normalizedPhone ? { phoneKey: normalizedPhone } : {}),
        updatedAt: new Date(),
      } };
      if (collection === 'clients' && !normalizedPhone) {
        profileUpdate.$unset = { phoneKey: '' };
      }
      await col(collection).updateOne({ userId: req.user.id }, profileUpdate, { session });
    });
  } catch (error) {
    const message = duplicateFieldMessage(error);
    if (message) throw new HttpError(409, message);
    throw error;
  }
  res.json({ data: publicRecord(await col(collection).findOne({ userId: req.user.id })) });
}));

router.post('/change-password', requireUser, route(async (req, res) => {
  const input = validate(z.object({ current: z.string().min(1), password: passwordField }), req.body);
  assert(await verifyPassword(input.current, req.user.passwordHash), 400, 'Contraseña actual incorrecta');
  await col('users').updateOne({ id: req.user.id }, { $set: { passwordHash: await hashPassword(input.password) } });
  await revokeUserSessions(req.user.id);
  res.clearCookie('myspa2_sid', { path: '/' });
  res.json({ message: 'Contraseña actualizada. Inicia sesión nuevamente.' });
}));

router.post('/forgot-password', route(async (req, res) => {
  const { email } = validate(z.object({ email: emailField }), req.body);
  const message = 'Si ese correo tiene una cuenta, recibirás instrucciones para recuperar el acceso.';
  const user = await col('users').findOne({ emailLower: email, status: 'ACTIVO' });
  if (user && emailReady() && resetTokenReady()) {
    const token = makePasswordResetToken(user);
    const link = `${config.appUrl}/restablecer/${token}`;
    try {
      await sendMail({
        to: email,
        subject: 'MySpa2 | Restablecer contraseña',
        text: `Para crear una nueva contraseña abre este enlace (válido 20 minutos):\n${link}\n\nSi no lo solicitaste, ignora este mensaje.`,
      });
    } catch (error) {
      console.error('[SMTP]', error.message);
    }
  }
  res.json({ message, smtpConfigured: emailReady() && resetTokenReady() });
}));

router.post('/reset-password', route(async (req, res) => {
  const { token, password } = validate(z.object({ token: z.string().min(20), password: passwordField }), req.body);
  const parsed = parsePasswordResetToken(token);
  assert(parsed && resetTokenReady(), 400, 'El enlace es inválido o expiró');
  const user = await col('users').findOne({ id: parsed.uid, status: 'ACTIVO' });
  assert(verifyPasswordResetToken(token, user), 400, 'El enlace es inválido, ya fue usado o expiró');
  // Compare-and-swap: solo una solicitud puede consumir este enlace con éxito.
  const updated = await col('users').updateOne({ id: user.id, passwordHash: user.passwordHash },
    { $set: { passwordHash: await hashPassword(password) } });
  assert(updated.modifiedCount === 1, 400, 'El enlace ya fue usado. Solicita otro.');
  await revokeUserSessions(user.id);
  res.json({ message: 'Contraseña restablecida. Ya puedes iniciar sesión.' });
}));

export default router;
