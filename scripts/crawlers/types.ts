export interface CrawlItem {
  source: 'kict' | 'kfi' | 'law';
  type?: string;
  title: string;
  external_id: string;
  department?: string;
  announced_at?: string; // YYYY-MM-DD
  has_file?: boolean;
  source_url?: string;
}

export interface CrawlResult {
  source: string;
  status: 'success' | 'failed';
  items_collected: number;
  new_items: number;
  error_message?: string;
}
