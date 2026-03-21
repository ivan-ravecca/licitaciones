# Licitaciones

Daily watcher for Uruguay government procurement RSS ([comprasestatales.gub.uy](https://www.comprasestatales.gub.uy)).

Fetches procurement announcements across all configured departments, uses Claude to detect semantic matches against a keyword list, and sends an email report with direct links to matching items.

## How it works

1. Runs every day at 8:30 AM (Uruguay time) via `node-cron`.
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

Edit `.env` with your SMTP credentials, Anthropic API key, and target email.

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
5. Start the application from the Plesk panel — `node-cron` keeps it running and fires at 8:30 AM daily.

> **Note:** Keep the app running continuously so `node-cron` can trigger on schedule.
> Plesk's "Keep alive" or a process manager like PM2 is recommended.

## Environment variables

| Variable            | Required | Description                                           |
| ------------------- | -------- | ----------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Claude API key for semantic matching                  |
| `SMTP_HOST`         | Yes      | SMTP server host                                      |
| `SMTP_PORT`         | No       | SMTP port (default: 587)                              |
| `SMTP_SECURE`       | No       | Use TLS (default: false)                              |
| `SMTP_USER`         | Yes      | SMTP auth user                                        |
| `SMTP_PASS`         | Yes      | SMTP auth password                                    |
| `EMAIL_FROM`        | Yes      | Sender address                                        |
| `EMAIL_TO`          | Yes      | Recipient address                                     |
| `CRON_SCHEDULE`     | No       | Cron expression (default: `30 11 * * *` = 8:30 AM UY) |
| `FETCH_DAYS_BACK`   | No       | Days to look back (default: 1)                        |
| `DEPARTMENT_ID_MAX` | No       | Max department ID to iterate (default: 30)            |
| `DEPARTMENT_IDS`    | No       | Explicit comma-separated list of department IDs       |

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
