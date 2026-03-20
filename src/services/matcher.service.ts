import Anthropic from '@anthropic-ai/sdk';
import { RssItem, MatchResult } from '../types';
import { config } from '../config';

const BATCH_SIZE = 20;

function buildPrompt(items: RssItem[], keywords: string[]): string {
  const keywordList = keywords.map((k) => `- "${k}"`).join('\n');
  const itemList = items
    .map(
      (item, i) =>
        `[${i}] TITLE: ${item.title}\nDESCRIPTION: ${item.description}`,
    )
    .join('\n\n');

  return `You are analyzing Uruguay government procurement announcements to find matches for a supplier's products.

KEYWORDS TO MATCH (including synonyms, similar products, or related items):
${keywordList}

PROCUREMENT ITEMS:
${itemList}

For each item, determine if it is relevant to any of the keywords above. Consider:
- Exact matches
- Similar products or services
- Items that would typically be acquired from a supplier of these products
- Spanish language variations and synonyms

Respond with a JSON array with one entry per item (same order, indexed 0 to ${items.length - 1}):
[
  {
    "index": 0,
    "matched": true,
    "matchedKeywords": ["keyword that matched"],
    "reason": "brief explanation in Spanish"
  },
  ...
]

Only include items where matched is true. For non-matches, still include the entry with matched: false and empty arrays.
Respond ONLY with the JSON array, no additional text.`;
}

export async function matchItems(
  client: Anthropic,
  items: RssItem[],
  keywords: string[],
): Promise<MatchResult[]> {
  if (items.length === 0) return [];

  const results: MatchResult[] = Array.from({ length: items.length }, () => ({
    matched: false,
    matchedKeywords: [],
    reason: '',
  }));

  // Process in batches to stay within token limits
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(batch, keywords);

    try {
      const response = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0]?.type === 'text' ? response.content[0].text : '';

      const parsed: Array<{
        index: number;
        matched: boolean;
        matchedKeywords: string[];
        reason: string;
      }> = JSON.parse(text);

      for (const entry of parsed) {
        const globalIndex = i + entry.index;
        if (globalIndex < results.length) {
          results[globalIndex] = {
            matched: entry.matched,
            matchedKeywords: entry.matchedKeywords ?? [],
            reason: entry.reason ?? '',
          };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[matcher] Batch starting at ${i} failed: ${message}`);
    }
  }

  return results;
}
