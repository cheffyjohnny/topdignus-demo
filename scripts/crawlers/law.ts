/**
 * 법제처 국가법령정보 Open API 크롤러
 * 건축법/소방법 관련 법령 개정 감지
 * API: https://www.law.go.kr/DRF/lawSearch.do
 */

import https from 'https';
import { parseStringPromise } from 'xml2js';
import type { CrawlItem } from './types';

const OC = process.env.LAW_API_KEY || 'topdignus';
const BASE_URL = 'https://www.law.go.kr';

// 추적할 법령 목록
const TARGET_LAWS = [
  { query: '건축법', target: 'law', exactName: '건축법' },
  { query: '건축법 시행령', target: 'law', exactName: '건축법 시행령' },
  { query: '건축물의 피난ㆍ방화구조 등의 기준에 관한 규칙', target: 'law', exactName: '건축물의 피난ㆍ방화구조 등의 기준에 관한 규칙' },
  { query: '소방시설 설치 및 관리에 관한 법률', target: 'law', exactName: '소방시설 설치 및 관리에 관한 법률' },
  { query: '건축자재등 품질인정 및 관리기준', target: 'admrul', exactName: '건축자재등 품질인정 및 관리기준' },
];

// 재시도 포함 fetch
async function fetchXmlWithRetry(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise<string>((resolve, reject) => {
        https.get(url, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        }).on('error', reject);
      });
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = 1000 * attempt; // 1초, 2초, 3초
      console.warn(`[LAW] 재시도 ${attempt}/${retries - 1} (${delay}ms 후)...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('fetch 실패');
}

async function searchLaw(query: string, target: string): Promise<any[]> {
  const params = new URLSearchParams({
    OC,
    target,
    query,
    type: 'XML',
    display: '10',
    page: '1',
  });

  const url = `${BASE_URL}/DRF/lawSearch.do?${params}`;
  const xml = await fetchXmlWithRetry(url);
  const parsed = await parseStringPromise(xml, { explicitArray: false });

  const result = parsed?.LawSearch ?? parsed?.AdmRulSearch;
  if (!result || result.resultCode !== '00') return [];

  // 법령은 'law', 행정규칙은 'admrul' 태그
  const laws = result.law ?? result.admrul;
  if (!laws) return [];
  return Array.isArray(laws) ? laws : [laws];
}

export async function crawlLaw(): Promise<CrawlItem[]> {
  const allItems: CrawlItem[] = [];

  for (const target of TARGET_LAWS) {
    try {
      await new Promise((r) => setTimeout(r, 500));
      const laws = await searchLaw(target.query, target.target);

      // 법령(law)과 행정규칙(admrul)은 필드명이 다름
      const isAdmrul = target.target === 'admrul';
      const nameField = isAdmrul ? '행정규칙명' : '법령명한글';
      const idField = isAdmrul ? '행정규칙일련번호' : '법령일련번호';
      const detailLinkField = isAdmrul ? '행정규칙상세링크' : '법령상세링크';
      const promulgatedField = isAdmrul ? '발령일자' : '공포일자';

      const matched = laws.find((law) => {
        const name: string = law[nameField] || '';
        return name === target.exactName || name.includes(target.query.split(' ')[0]);
      });

      if (!matched) {
        console.warn(`[LAW] '${target.exactName}' 검색 결과 없음`);
        continue;
      }

      const lawName: string = matched[nameField] || '';
      const promulgatedAt: string = matched[promulgatedField] || '';
      const effectiveAt: string = matched['시행일자'] || '';
      const lawNo: string = matched[idField] || '';
      const mst: string = matched['법령MST'] || matched['행정규칙ID'] || '';
      const detailLink: string = matched[detailLinkField] || '';

      const formatDate = (d: string) =>
        d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

      const publicUrl = target.target === 'admrul'
        ? `${BASE_URL}/행정규칙/${encodeURIComponent(lawName)}`
        : `${BASE_URL}/법령/${encodeURIComponent(lawName)}`;

      allItems.push({
        source: 'law',
        type: matched['법령종류명'] || (target.target === 'admrul' ? '행정규칙' : '법령'),
        title: `[법령개정] ${lawName}`,
        external_id: `law_${lawNo || lawName}`,
        department: matched['소관부처명'] || undefined,
        announced_at: formatDate(promulgatedAt || effectiveAt) || undefined,
        has_file: false,
        source_url: publicUrl,
      });

      console.log(`[LAW] ✓ ${lawName} (${formatDate(promulgatedAt || effectiveAt)})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[LAW] '${target.exactName}' 실패: ${message}`);
    }
  }

  console.log(`[LAW] 총 ${allItems.length}건 수집 완료`);
  return allItems;
}
