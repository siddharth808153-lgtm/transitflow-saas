// src/config.js — Centralized configuration from environment variables
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  serviceSecret: process.env.SERVICE_SECRET || 'transport_whatsapp_secret_2024',
  laravelCallbackUrl: process.env.LARAVEL_CALLBACK_URL || 'http://localhost:8000/api/whatsapp/status-update',
  sessionDir: path.resolve(__dirname, '..', process.env.SESSION_DIR || './sessions'),
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
