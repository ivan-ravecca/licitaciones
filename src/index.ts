import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';
import { fetchAllDepartments } from './services/rss.service';
import { matchItems } from './services/matcher.service';
import { sendReport } from './services/email.service';
import { MatchedItem } from './types';
import keywordsData from '../data/keywords.json';

const keywords: string[] = keywordsData.keywords;

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
  const departmentResults = await fetchAllDepartments(
    config.departmentIds,
    config.fetchDaysBack,
  );

  const totalFetched = departmentResults.reduce((sum, r) => sum + r.items.length, 0);
  console.log(`[licitaciones] Total items fetched: ${totalFetched}`);

  if (totalFetched === 0) {
    await sendReport(
      { date, totalFetched: 0, totalMatched: 0, matches: [] },
      config,
    );
    return;
  }

  // Match items per department using Claude
  const allMatches: MatchedItem[] = [];

  for (const { departmentId, items } of departmentResults) {
    console.log(`[licitaciones] Matching ${items.length} item(s) for department ${departmentId}...`);
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

// Schedule cron job
cron.schedule(
  config.cronSchedule,
  () => {
    runCheck().catch((err) => {
      console.error('[licitaciones] Unhandled error during check:', err);
    });
  },
  { timezone: 'America/Montevideo' },
);

console.log(`[licitaciones] Scheduler started. Cron: "${config.cronSchedule}" (America/Montevideo)`);
console.log('[licitaciones] Run "npm run dev -- --now" to trigger immediately.');

// Allow manual trigger via CLI flag
if (process.argv.includes('--now')) {
  runCheck().catch((err) => {
    console.error('[licitaciones] Error:', err);
    process.exit(1);
  });
}
