import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseDepartmentIds(): number[] {
  const explicit = process.env['DEPARTMENT_IDS'];
  if (explicit) {
    return explicit
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }
  const max = parseInt(process.env['DEPARTMENT_ID_MAX'] ?? '30', 10);
  return Array.from({ length: max }, (_, i) => i + 1);
}

export const config: AppConfig = {
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  anthropicModel: requireEnv('ANTHROPIC_MODEL'),
  smtp: {
    host: requireEnv('SMTP_HOST'),
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    secure: process.env['SMTP_SECURE'] === 'true',
    user: requireEnv('SMTP_USER'),
    pass: requireEnv('SMTP_PASS'),
  },
  email: {
    from: requireEnv('EMAIL_FROM'),
    to: requireEnv('EMAIL_TO'),
  },
  cronSchedule: process.env['CRON_SCHEDULE'] ?? '30 11 * * *',
  fetchDaysBack: parseInt(process.env['FETCH_DAYS_BACK'] ?? '1', 10),
  departmentIds: parseDepartmentIds(),
};
