import dotenv from 'dotenv';
import { z } from 'zod';

// Optional .env support for local development; Plesk provides env vars directly.
dotenv.config();

const rawEnv = process.env;

const envSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().min(1),
    ANTHROPIC_MODEL: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().email(),
    EMAIL_TO: z.string().email(),
    PORT: z.coerce.number().int().positive().default(3000),
    CRON_SCHEDULE: z.string().default('30 8 * * 1-5'),
    FETCH_DAYS_BACK: z.coerce.number().int().positive().default(1),
    DEPARTMENT_ID_MAX: z.coerce.number().int().positive().default(30),
    DEPARTMENT_IDS: z.string().optional(),
    TRIGGER_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .catchall(z.string());

const parsedEnv = envSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
  throw new Error(`[config] Invalid .env values: ${issues}`);
}

export const env = parsedEnv.data;
