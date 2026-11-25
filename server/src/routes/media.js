import { Router } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { col } from '../lib/db.js';
import { assert, route, HttpError } from '../lib/http.js';
import { requireUser, isStaff } from '../lib/security.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(422, 'Sube una imagen JPG, PNG o WebP'));
  },
});

function validImage(bytes, mime) {
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  }
  if (mime === 'image/webp') {
    return bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

router.post('/', requireUser, upload.single('photo'), route(async (req, res) => {
  assert(req.file, 422, 'Selecciona una imagen');
  assert(validImage(req.file.buffer, req.file.mimetype), 422, 'El contenido no corresponde a una imagen válida');
  const result = await col('media').insertOne({
    contentType: req.file.mimetype,
    bytes: req.file.buffer,
    ownerUserId: req.user.id,
    createdAt: new Date(),
  });
  res.status(201).json({ data: { url: `/api/media/${result.insertedId.toString()}` } });
}));

router.get('/:id', route(async (req, res) => {
  assert(ObjectId.isValid(req.params.id), 404, 'Imagen no encontrada');
  const item = await col('media').findOne({ _id: new ObjectId(req.params.id) });
  assert(item, 404, 'Imagen no encontrada');
  const url = `/api/media/${req.params.id}`;
  const isPublic = !!(await col('rooms').findOne({ photoUrl: url, status: 'ACTIVO' }));
  // The offline catalogue uses a separate, strictly public URL.
  if (req.query.public === '1') assert(isPublic, 403, 'Imagen no pública');
  if (!isPublic) {
    const ownImage = item.ownerUserId === req.user?.id;
    const clientProfile = req.user?.role === 'CLIENTE'
      ? await col('clients').findOne({ userId: req.user.id, photoUrl: url }) : null;
    const employeeProfile = isStaff(req.user)
      ? await col('employees').findOne({ userId: req.user.id, photoUrl: url }) : null;
    assert(ownImage || clientProfile || employeeProfile || req.user?.role === 'ADMIN',
      403, 'Imagen privada');
  }
  res.set({
    'Content-Type': item.contentType,
    'Cache-Control': isPublic ? 'public, max-age=86400' : 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(item.bytes.buffer ? Buffer.from(item.bytes.buffer) : item.bytes);
}));

export default router;
