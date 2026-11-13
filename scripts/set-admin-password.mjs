import { connectDatabase, closeDatabase, col } from '../server/src/lib/db.js';
import { hashPassword, passwordField } from '../server/src/lib/security.js';

// Operación manual de recuperación. Solo afecta a admin.myspa2 en la base myspa2.
const username = 'admin.myspa2';
if (!process.argv.includes(`--confirm=${username}`)) {
  console.error(`Cancelado. Confirma con: npm run admin:password -- --confirm=${username}`);
  process.exit(1);
}

// config.js carga el .env al importar los módulos anteriores.
const password = process.env.SEED_ADMIN_PASSWORD;
if (!passwordField.safeParse(password).success) {
  console.error('Define SEED_ADMIN_PASSWORD en .env (10–128 caracteres, mayúscula, minúscula y número).');
  process.exit(1);
}

try {
  await connectDatabase();
  const user = await col('users').findOne({ usernameLower: username });
  if (!user || user.role !== 'EMPLEADO' || user.status !== 'ACTIVO') {
    throw new Error('No se encontró la cuenta activa admin.myspa2. Ejecuta primero npm run seed.');
  }

  const passwordHash = await hashPassword(password);
  await col('users').updateOne({ _id: user._id }, { $set: { passwordHash } });
  await col('sessions').deleteMany({ userId: user.id });
  console.log('Contraseña de admin.myspa2 actualizada; sesiones anteriores cerradas.');
  console.log('Elimina SEED_ADMIN_PASSWORD de tu .env después de usarla.');
} catch (error) {
  console.error('[RECUPERACIÓN]', error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
