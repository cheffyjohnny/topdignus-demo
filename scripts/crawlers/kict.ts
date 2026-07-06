/**
 * 한국건설기술연구원 (KICT) 크롤러
 * 내화채움구조 성능인정 목록 수집
 * URL: https://www.kict.re.kr/governmentWeb/getGovernmentContentList.es
 */

import * as cheerio from 'cheerio';
import type { CrawlItem } from './types';

const BASE_URL = 'https://www.kict.re.kr';
const LIST_URL = `${BASE_URL}/governmentWeb/getGovernmentContentList.es`;
const PAGE_SIZE = 10;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': BASE_URL,
};

// 제목에서 타입 추출: [신규인정], [인정변경], [인정취소] 등
function extractType(title: string): string | undefined {
  const match = title.match(/^\[([^\]]+)\]/);
  return match ? match[1] : undefined;
}

// onclick 속성에서 content ID 추출
// government_content_detail_move(this.href, '5187')
function extractContentId(onclick: string): string | undefined {
  const match = onclick.match(/'(\d+)'/);
  return match ? match[1] : undefined;
}

async function fetchPage(page: number): Promise<{ items: CrawlItem[]; totalPages: number }> {
  const params = new URLSearchParams({
    currentPage: String(page),
    pageCnt: String(PAGE_SIZE),
    mid: 'a10602050000',
    pid: '83',
    keyField: '',
    keyWord: '',
  });

  const url = `${LIST_URL}?${params}`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for page ${page}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // 전체 페이지 수 파싱
  let totalPages = 1;
  const lastPageLink = $('a.pageLast').attr('href');
  if (lastPageLink) {
    const m = lastPageLink.match(/currentPage=(\d+)/);
    if (m) totalPages = parseInt(m[1]);
  }
  // fallback: current_page 텍스트에서 파싱
  if (totalPages === 1) {
    const pageText = $('.current_page b').first().text().trim();
    const parsed = parseInt(pageText);
    if (!isNaN(parsed)) totalPages = parsed;
  }

  const items: CrawlItem[] = [];

  $('#listView ul').each((_, el) => {
    const cols = $(el).find('li');

    const titleEl = $(el).find('li.title a');
    const titleText = titleEl.text().trim();
    if (!titleText) return;

    const onclick = titleEl.attr('onclick') || '';
    const contentId = extractContentId(onclick);
    if (!contentId) return;

    const department = cols.filter('.W15').text().replace('공표부서', '').trim();
    const announcedAt = cols.filter('.W10').text().replace('공표일', '').trim();
    const hasFile = $(el).find('a.btn-file').length > 0;

    items.push({
      source: 'kict',
      type: extractType(titleText),
      title: titleText,
      external_id: contentId,
      department: department || undefined,
      announced_at: announcedAt || undefined,
      has_file: hasFile,
      source_url: `${BASE_URL}/governmentWeb/getGovernmentContentsView.es?mid=a10602050000&pid=83&id=${contentId}&keyWord=`,
    });
  });

  return { items, totalPages };
}

export async function crawlKict(): Promise<CrawlItem[]> {
  const allItems: CrawlItem[] = [];

  // 1페이지 먼저 가져와서 전체 페이지 수 확인
  const first = await fetchPage(1);
  allItems.push(...first.items);

  console.log(`[KICT] 전체 ${first.totalPages}페이지 수집 시작...`);

  // 나머지 페이지
  for (let page = 2; page <= first.totalPages; page++) {
    await new Promise((r) => setTimeout(r, 500)); // 서버 부하 방지
    const result = await fetchPage(page);
    allItems.push(...result.items);
    process.stdout.write(`\r[KICT] ${page}/${first.totalPages} 페이지 완료`);
  }

  console.log(`\n[KICT] 총 ${allItems.length}건 수집 완료`);
  return allItems;
}
