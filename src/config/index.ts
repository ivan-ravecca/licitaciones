import { AppConfig } from '../types';
import { env } from './env';

function parseDepartmentIds(): number[] {
  const explicit = env.DEPARTMENT_IDS;
  if (explicit) {
    return explicit
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }
  const max = env.DEPARTMENT_ID_MAX;
  return Array.from({ length: max }, (_, i) => i + 1);
}

export const config: AppConfig = {
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.ANTHROPIC_MODEL,
  resendApiKey: env.RESEND_API_KEY,
  port: env.PORT,
  isProduction: env.NODE_ENV === 'production',
  email: {
    from: env.EMAIL_FROM,
    to: env.EMAIL_TO,
  },
  cronSchedule: env.CRON_SCHEDULE,
  fetchDaysBack: env.FETCH_DAYS_BACK,
  departmentIds: parseDepartmentIds(),
  triggerToken: env.TRIGGER_TOKEN,
};
