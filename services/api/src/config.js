import { AWARDS } from './constants.js';

// Load + validate runtime configuration from the environment (per-container
// .env, injected at runtime — see docs/DESIGN.md §7). Throws on missing
// required values so the container fails fast on a bad deploy.
export function loadConfig(env = process.env) {
  const req = (name) => {
    const v = env[name];
    if (v == null || !String(v).trim()) throw new Error(`Missing required env: ${name}`);
    return String(v).trim();
  };
  const opt = (name, fallback = '') => {
    const v = env[name];
    return v != null && String(v).trim() ? String(v).trim() : fallback;
  };

  const deadlines = {
    hurdle: new Date(req('HURDLE_DEADLINE')),
    lamberson: new Date(req('LAMBERSON_DEADLINE')),
  };
  for (const [award, when] of Object.entries(deadlines)) {
    if (Number.isNaN(when.getTime())) {
      throw new Error(`Invalid ${award.toUpperCase()}_DEADLINE — need an ISO 8601 datetime with a timezone offset`);
    }
  }

  const port = Number(opt('SMTP_PORT', '587'));
  if (Number.isNaN(port)) throw new Error('SMTP_PORT must be a number');

  return {
    turnstileSecret: req('TURNSTILE_SECRET_KEY'),
    smtp: {
      host: req('SMTP_HOST'),
      port,
      user: req('SMTP_USER'),
      pass: req('SMTP_PASS'),
    },
    mailFrom: req('MAIL_FROM'),
    presidentEmail: req('PRESIDENT_EMAIL'),
    notifyEmail: opt('NOTIFY_EMAIL'),
    season: opt('SEASON', String(new Date().getFullYear())),
    timeZone: opt('TZ_LEAGUE', 'America/New_York'),
    deadlines,
    prompts: {
      hurdle: opt('HURDLE_PROMPT', AWARDS.hurdle.defaultPrompt),
      lamberson: opt('LAMBERSON_PROMPT', AWARDS.lamberson.defaultPrompt),
    },
  };
}
