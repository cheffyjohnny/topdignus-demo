/**
 * 한국소방산업기술원 (KFI) 크롤러
 * 방화포 성능인증 승인정보 수집
 * URL: https://www.kfi.or.kr/portal/openDataFsuplAprv/openDataFsuplAprv/opnFsuplAprv02.do
 *
 * KFI 사이트는 비표준 응답 헤더 문제로 Node.js HTTP 파서가 거부 (Parse Error: Invalid header token).
 * curl spawn 방식으로 우회 (shell 없이 args 배열로 크로스 플랫폼 호환).
 */

import * as cheerio from 'cheerio';
import { spawn } from 'child_process';
import type { CrawlItem } from './types';

const BASE_URL = 'https://www.kfi.or.kr';
const LIST_URL = `${BASE_URL}/portal/openDataFsuplAprv/openDataFsuplAprv/opnFsuplAprv02.do`;

async function fetchWithCurl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-sL',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: ko-KR,ko;q=0.9',
      '-H', `Referer: ${BASE_URL}`,
      url,
    ]);
    const chunks: Buffer[] = [];
    curl.stdout.on('data', (c: Buffer) => chunks.push(c));
    curl.on('error', reject);
    curl.on('close', (code: number) => {
      if (code !== 0) reject(new Error(`curl exited with code ${code}`));
      else resolve(Buffer.concat(chunks).toString('utf-8'));
    });
  });
}

// 방화포: gdsClCd=04, gdsCd=41900
const PARAMS = {
  menuNo: '500318',
  fromAprv: '2010-01-01',
  toAprv: new Date().toISOString().slice(0, 10), // 오늘 날짜
  searchYn: 'Y',
  gdsClCd: '04',
  gdsCd: '41900',
  pageUnit: '10',
  techBaseSeCd: '02',
};

async function fetchPage(page: number): Promise<{ items: CrawlItem[]; totalPages: number }> {
  const params = new URLSearchParams({ ...PARAMS, pageIndex: String(page) });
  const url = `${LIST_URL}?${params}`;
  const html = await fetchWithCurl(url);
  const $ = cheerio.load(html);

  // 전체 페이지 수: pagination 버튼 중 마지막 숫자
  let totalPages = 1;
  $('.pagination.desktop .pg').each((_, el) => {
    const num = parseInt($(el).text().trim());
    if (!isNaN(num) && num > totalPages) totalPages = num;
  });

  const items: CrawlItem[] = [];

  $('table tbody tr').each((_, row) => {
    // desktop 컬럼에서 데이터 추출
    const cells = $(row).find('td.desktop span');
    if (cells.length < 4) return;

    const company = $(row).find('td').first().find('span.desktop').text().trim();
    const type = $(cells[0]).text().trim();         // 종별
    const approvalNo = $(cells[1]).text().trim();   // 승인(인정)번호
    const approvalDate = $(cells[2]).text().trim(); // 승인(인정)일자
    const model = $(cells[3]).text().trim();        // 형식

    if (!company || !approvalNo) return;

    // 날짜 형식 변환: 2026.04.10 → 2026-04-10
    const normalizedDate = approvalDate.replace(/\./g, '-').replace(/-$/, '');

    items.push({
      source: 'kfi',
      type,
      title: `[${type}] ${company} - ${model}`,
      external_id: approvalNo,
      department: company,
      announced_at: normalizedDate || undefined,
      has_file: false,
      source_url: `${LIST_URL}?${new URLSearchParams({ ...PARAMS, pageIndex: String(page) })}`,
    });
  });

  return { items, totalPages };
}

export async function crawlKfi(): Promise<CrawlItem[]> {
  const allItems: CrawlItem[] = [];

  const first = await fetchPage(1);
  allItems.push(...first.items);

  console.log(`[KFI] 전체 ${first.totalPages}페이지 수집 시작...`);

  for (let page = 2; page <= first.totalPages; page++) {
    await new Promise((r) => setTimeout(r, 500));
    const { items } = await fetchPage(page);
    allItems.push(...items);
    process.stdout.write(`\r[KFI] ${page}/${first.totalPages} 페이지 완료`);
  }

  console.log(`\n[KFI] 총 ${allItems.length}건 수집 완료`);
  return allItems;
}
