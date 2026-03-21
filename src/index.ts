import http from 'node:http';
import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';
import { fetchAllDepartments } from './services/rss.service';
import { matchItems } from './services/matcher.service';
import { sendReport } from './services/email.service';
import { MatchedItem } from './types';
import keywordsData from '../data/keywords.json';

const keywords: string[] = keywordsData.keywords;
let activeRun: Promise<void> | null = null;

async function runCheck(): Promise<void> {
  const date = new Date().toLocaleDateString('es-UY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Montevideo',
  });

  console.log(`[licitaciones] Starting check for ${date}`);
  console.log(`[licitaciones] Departments: ${config.departmentIds.length}`);
  console.log(`[licitaciones] Keywords: ${keywords.length}`);

  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

  // Fetch all departments in parallel
  const departmentResults = await fetchAllDepartments(config.departmentIds, config.fetchDaysBack);

  const totalFetched = departmentResults.reduce((sum, r) => sum + r.items.length, 0);
  console.log(`[licitaciones] Total items fetched: ${totalFetched}`);

  if (totalFetched === 0) {
    await sendReport({ date, totalFetched: 0, totalMatched: 0, matches: [] }, config);
    return;
  }

  // Match items per department using Claude
  const allMatches: MatchedItem[] = [];

  for (const { departmentId, items } of departmentResults) {
    console.log(
      `[licitaciones] Matching ${items.length} item(s) for department ${departmentId}...`,
    );
    const results = await matchItems(anthropic, items, keywords);

    for (let i = 0; i < items.length; i++) {
      const result = results[i];
      if (result?.matched) {
        allMatches.push({
          ...items[i],
          matchedKeywords: result.matchedKeywords,
          reason: result.reason,
          departmentId,
        });
      }
    }
  }

  // Deduplicate by link (same item may appear across departments)
  const seen = new Set<string>();
  const uniqueMatches = allMatches.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  console.log(`[licitaciones] Matches found: ${uniqueMatches.length}`);

  await sendReport(
    {
      date,
      totalFetched,
      totalMatched: uniqueMatches.length,
      matches: uniqueMatches,
    },
    config,
  );

  console.log('[licitaciones] Check complete.');
}

function triggerRun(source: 'cron' | 'http' | 'cli'): Promise<void> {
  if (activeRun) {
    console.log(`[licitaciones] Skipping ${source} trigger because a run is already in progress.`);
    return activeRun;
  }

  activeRun = runCheck().finally(() => {
    activeRun = null;
  });

  return activeRun;
}

function startScheduler(): void {
  cron.schedule(
    config.cronSchedule,
    () => {
      triggerRun('cron').catch((err) => {
        console.error('[licitaciones] Unhandled error during check:', err);
      });
    },
    { timezone: 'America/Montevideo' },
  );

  console.log(
    `[licitaciones] Scheduler started. Cron: "${config.cronSchedule}" (America/Montevideo)`,
  );
  console.log('[licitaciones] Run "npm run dev -- --now" to trigger one-shot mode.');
}

function isAuthorized(url: URL): boolean {
  if (!config.triggerToken) {
    return true;
  }

  return url.searchParams.get('token') === config.triggerToken;
}

function startHttpServer(): void {
  const server = http.createServer((req, res) => {
    const proto = req.headers['x-forwarded-proto'] ?? 'http';
    const scheme = Array.isArray(proto) ? proto[0] : proto;
    const requestUrl = new URL(req.url ?? '/', `${scheme}://${req.headers.host ?? 'localhost'}`);

    if (requestUrl.searchParams.get('run') === '1') {
      if (!isAuthorized(requestUrl)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('forbidden');
        return;
      }

      if (activeRun) {
        res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('job already running');
        return;
      }

      triggerRun('http').catch((err) => {
        console.error('[licitaciones] HTTP-triggered run failed:', err);
      });

      res.writeHead(202, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('run started');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('hola mundo');
  });

  server.listen(config.port, () => {
    console.log(`[licitaciones] HTTP server listening on port ${config.port}`);
  });
}

async function main(): Promise<void> {
  const runOnce = process.argv.includes('--now') || process.argv.includes('--once');

  if (runOnce) {
    console.log('[licitaciones] Running in one-shot mode.');
    try {
      await triggerRun('cli');
    } catch (err) {
      console.error('[licitaciones] Error:', err);
      process.exitCode = 1;
    }
    return;
  }

  startScheduler();
  startHttpServer();
}

void main();
