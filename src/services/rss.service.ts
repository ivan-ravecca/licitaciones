import Parser from 'rss-parser';
import { RssItem } from '../types';

const RSS_BASE = 'https://www.comprasestatales.gub.uy/consultas/rss';

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
});

function buildDateRange(daysBack: number): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 0);

  const start = new Date();
  start.setDate(start.getDate() - (daysBack - 1));
  start.setHours(0, 0, 0, 0);

  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  return { start: fmt(start), end: fmt(end) };
}

function buildRssUrl(departmentId: number, daysBack: number): string {
  const { start, end } = buildDateRange(daysBack);
  const rangeParam = encodeURIComponent(`${start}_${end}`);
  return (
    `${RSS_BASE}/tipo-pub/ALL/inciso/${departmentId}/tipo-doc/C` +
    `/tipo-fecha/MOD/filtro-cat/CAT/orden/ORD_MOD/tipo-orden/DESC` +
    `/rango-fecha/${rangeParam}`
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&sol;/g, '/')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&oacute;/g, 'ó')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchDepartmentItems(
  departmentId: number,
  daysBack: number,
): Promise<RssItem[]> {
  const url = buildRssUrl(departmentId, daysBack);

  try {
    const feed = await parser.parseURL(url);

    return (feed.items ?? []).map((item) => ({
      title: item.title ?? '',
      description: stripHtml(item.contentEncoded ?? item.content ?? item.summary ?? ''),
      link: item.link ?? item.guid ?? '',
      pubDate: item.pubDate ?? '',
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[rss] Department ${departmentId} fetch failed: ${message}
      Url: ${url}`);
    return [];
  }
}

export async function fetchAllDepartments(
  departmentIds: number[],
  daysBack: number,
): Promise<{ departmentId: number; items: RssItem[] }[]> {
  const results = await Promise.all(
    departmentIds.map(async (id) => {
      const items = await fetchDepartmentItems(id, daysBack);
      if (items.length > 0) {
        console.log(`[rss] Department ${id}: ${items.length} item(s) found`);
      }
      return { departmentId: id, items };
    }),
  );

  return results.filter((r) => r.items.length > 0);
}
