export interface RssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

export interface MatchedItem extends RssItem {
  matchedKeywords: string[];
  reason: string;
  departmentId: number;
}

export interface MatchResult {
  matched: boolean;
  matchedKeywords: string[];
  reason: string;
}

export interface EmailReport {
  date: string;
  totalFetched: number;
  totalMatched: number;
  matches: MatchedItem[];
}

export interface AppConfig {
  anthropicApiKey: string;
  anthropicModel: string;
  resendApiKey: string;
  port: number;
  isProduction: boolean;
  email: {
    from: string;
    to: string;
  };
  cronSchedule: string;
  fetchDaysBack: number;
  departmentIds: number[];
  triggerToken?: string;
}
