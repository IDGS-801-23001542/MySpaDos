import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
dotenv.config({ path: path.join(root, '.env') });

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI,
  // Intentionally ignore legacy MONGODB_DB_NAME=myspa to protect the old project.
  databaseName: 'myspa2',
  production: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_PUBLIC_URL || 'http://127.0.0.1:5173',
  allowedOrigins: [process.env.WEB_ORIGIN, process.env.APP_PUBLIC_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'].filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
};

