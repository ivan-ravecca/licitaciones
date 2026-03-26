# Licitaciones

Daily watcher for Uruguay government procurement RSS ([comprasestatales.gub.uy](https://www.comprasestatales.gub.uy)).

Fetches procurement announcements across all configured departments, uses Claude to detect semantic matches against a keyword list, and sends an email report with direct links to matching items.

## How it works

1. Runs every weekday at 5:00 PM (Uruguay time) via `node-cron`.
2. Fetches the RSS feed for each configured department ID.
3. Sends all items to Claude in batches to find semantic keyword matches.
4. Sends an HTML email report with matched items and direct links.

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Resend API key, Anthropic API key/model, and target email.

### 3) Configure keywords

Edit `data/keywords.json`:

```json
{
  "keywords": [
    "Sellos de Goma",
    "grabados de acrílico",
    "placas de acrílico",
    "Fechadores",
    "Solaperos"
  ]
}
```

### 4) Configure departments

In `.env`, either:

- Set `DEPARTMENT_ID_MAX=30` to iterate IDs 1–30.
- Or set `DEPARTMENT_IDS=1,5,8,12` to use an explicit list.

## Running

### Development (run immediately)

```bash
npm run dev -- --now
```

### Start scheduler (stays running)

```bash
npm run dev
```

### Production (build + start)

```bash
npm run build
npm start
```

### Production (run immediately in production)

```bash
npm run build
node dist/index.js --now
```

## Deploying on Plesk (Node.js app)

1. Upload project files to your Plesk hosting directory.
2. Set the **Application startup file** to `dist/index.js`.
3. Add environment variables in the Plesk Node.js panel (same as `.env`).
4. Run `npm install && npm run build` via SSH.
5. Start the application from the Plesk panel — `node-cron` keeps it running and fires at 5:00 PM on weekdays.

> **Note:** Keep the app running continuously so `node-cron` can trigger on schedule.
> Plesk's "Keep alive" or a process manager like PM2 is recommended.

## UptimeRobot setup (recommended for Plesk/shared hosting)

Use UptimeRobot only for health checks and optional keep-alive. Do not use it to trigger a full run.

1. Deploy and run the app.
2. Open `https://YOUR_DOMAIN/?status=1` or `https://YOUR_DOMAIN/health`.
3. Confirm JSON response with `ok: true`.
4. In UptimeRobot, create an **HTTP(s)** monitor:
  - Friendly name: `licitaciones-health`
  - URL: `https://YOUR_DOMAIN/health`
  - Monitoring interval: `5 minutes`
  - Method: `GET`
5. Save and verify monitor status turns **Up**.

### Important safety note

- `GET /health` (or `?status=1`) is safe for monitoring.
- `GET /run` (or `?run=1`) starts a full job: RSS fetch + Anthropic matching + email send.
- Never point UptimeRobot to `/run`, otherwise you'll increase API usage and costs.

## Environment variables

| Variable            | Required | Description                                           |
| ------------------- | -------- | ----------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Claude API key for semantic matching                  |
| `ANTHROPIC_MODEL`   | Yes      | Anthropic model id (for example `claude-3-5-sonnet-20241022`) |
| `RESEND_API_KEY`    | Yes      | Resend API key for email delivery                     |
| `EMAIL_FROM`        | Yes      | Sender address                                        |
| `EMAIL_TO`          | Yes      | Recipient address                                     |
| `PORT`              | No       | HTTP port for status/run endpoints (default: 3000)    |
| `CRON_SCHEDULE`     | No       | Cron expression (default: `0 17 * * 1-5` = 5:00 PM UY, Monday-Friday) |
| `FETCH_DAYS_BACK`   | No       | Days to look back (default: 1)                        |
| `DEPARTMENT_ID_MAX` | No       | Max department ID to iterate (default: 30)            |
| `DEPARTMENT_IDS`    | No       | Explicit comma-separated list of department IDs       |
| `TRIGGER_TOKEN`     | No       | Token required by `?run=1` / `/run` when set          |
| `NODE_ENV`          | No       | `development`, `production`, or `test` (default: `development`) |

## Project structure

```
src/
├── config/index.ts          # Environment and config loader
├── services/
│   ├── rss.service.ts       # RSS fetching and parsing
│   ├── matcher.service.ts   # Claude-based keyword matching
│   └── email.service.ts     # Email report generation and delivery
├── types/index.ts           # TypeScript types
└── index.ts                 # Entry point + cron scheduler
data/
└── keywords.json            # Editable keyword list
```
