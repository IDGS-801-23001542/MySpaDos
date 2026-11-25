import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client;
let database;

export async function connectDatabase() {
  if (database) return database;
  if (!config.mongoUri) throw new Error('Falta MONGODB_URI en .env');

  const next = new MongoClient(config.mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  await next.connect();
  const db = next.db(config.databaseName);
  await db.command({ ping: 1 });
  client = next;
  database = db;
  return db;
}

export function col(name) {
  if (!database) throw new Error('La base de datos no está conectada');
  return database.collection(name);
}

export function getMongoClient() {
  if (!client) throw new Error('La conexión no está disponible');
  return client;
}

export async function inTransaction(operation) {
  const session = getMongoClient().startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } finally {
    await session.endSession();
  }
}

export function getDatabase() {
  if (!database) throw new Error('La base de datos no está conectada');
  return database;
}

export async function closeDatabase() {
  await client?.close();
  client = undefined;
  database = undefined;
}

// Colección counters eliminada. Conservamos los IDs numéricos para que no se
// rompan las referencias existentes (incluidas las del seed anterior).
// La unicidad la garantizan los índices de cada colección; los IDs nuevos ya
// no son consecutivos y se generan con entropía criptográfica (48 bits).
export async function nextId(_name, _session) {
  return crypto.randomBytes(6).readUIntBE(0, 6) || 1;
}

// RF 0102 / RF 0202: código RFC + marca de tiempo en microsegundos lógicos.
// Evita el contador en MongoDB y garantiza incremento dentro de este proceso.
// Los índices únicos de employeeNumber/clientNumber son la protección final
// frente a una coincidencia excepcional entre procesos distintos.
const lastNumberTimestamp = new Map();
export async function nextNumberTimestamp(kind, _session) {
  const current = Date.now() * 1000 + crypto.randomInt(0, 1000);
  const next = Math.max(current, (lastNumberTimestamp.get(kind) || 0) + 1);
  lastNumberTimestamp.set(kind, next);
  return next;
}

export async function ensureIndexes() {
  await Promise.all([
    ...['users', 'employees', 'clients', 'products', 'branches', 'rooms', 'schedules', 'treatments', 'reservations', 'services'].map(
      (name) => col(name).createIndex({ id: 1 }, { unique: true }),
    ),
    col('users').createIndex({ usernameLower: 1 }, { unique: true }),
    col('users').createIndex({ emailLower: 1 }, { unique: true, sparse: true }),
    col('employees').createIndex({ employeeNumber: 1 }, { unique: true }),
    col('employees').createIndex({ userId: 1 }, { unique: true }),
    col('clients').createIndex({ clientNumber: 1 }, { unique: true }),
    col('clients').createIndex({ userId: 1 }, { unique: true }),
    col('clients').createIndex({ phoneKey: 1 }, { unique: true, partialFilterExpression: { phoneKey: { $type: 'string' } } }),
    col('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    col('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    col('reservations').createIndex({ slotKey: 1 }, { unique: true, partialFilterExpression: { blocksSlot: true } }),
    col('reservations').createIndex({ clientId: 1, createdAt: -1 }),
    col('reservations').createIndex({ status: 1, endAt: 1 }),
    col('reservations').createIndex({ branchId: 1, date: 1 }),
    col('services').createIndex({ reservationId: 1 }, { unique: true }),
    col('rooms').createIndex({ branchId: 1, status: 1 }),
    col('employees').createIndex({ branchId: 1, status: 1 }),
    col('products').createIndex({ name: 1, brand: 1 }),
    col('schedules').createIndex({ start: 1, end: 1 }),
    col('reservations').createIndex({ roomId: 1, date: 1, blocksSlot: 1 }),
    col('services').createIndex({ branchId: 1, dateTime: -1 }),
  ]);
}
