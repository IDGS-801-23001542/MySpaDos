import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, ensureIndexes } from './lib/db.js';
import { config } from './lib/config.js';
import { duplicateFieldMessage } from './lib/accountFields.js';
import { authenticate, csrfGuard } from './lib/security.js';
import auth from './routes/auth.js';
import publicRoutes from './routes/public.js';
import manage from './routes/manage.js';
import reservations from './routes/reservations.js';
import services from './routes/services.js';
import media from './routes/media.js';
import dashboard from './routes/dashboard.js';

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' || !req.path.startsWith('/public/') || req.path === '/public/availability') {
    res.set('Cache-Control', 'no-store');
  }
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/reset-password', rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/media', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(authenticate);
app.use(csrfGuard);

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'MySpa2', database: config.databaseName }));
app.use('/api/auth', auth);
app.use('/api/public', publicRoutes);
app.use('/api/manage', manage);
app.use('/api/reservations', reservations);
app.use('/api/services', services);
app.use('/api/media', media);
app.use('/api/dashboard', dashboard);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
app.use(express.static(root));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(root, 'index.html'), (error) => { if (error) next(error); });
});

app.use((error, _req, res, _next) => {
  const duplicateMessage = duplicateFieldMessage(error);
  const status = error.status || (duplicateMessage ? 409 : error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[MySpa2 API]', error);
  res.status(status).json({ error: duplicateMessage || (status >= 500 ? 'Error interno del servidor' : error.message) });
});

try {
  await connectDatabase();
  await ensureIndexes();
  app.listen(config.port, () => {
    console.log(`[MySpa2] API lista en http://127.0.0.1:${config.port} (Atlas: ${config.databaseName})`);
  });
} catch (error) {
  console.error('[MySpa2] No se pudo iniciar:', error.message);
  process.exitCode = 1;
}
