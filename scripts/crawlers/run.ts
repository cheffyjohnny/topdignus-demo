/**
 * 크롤러 메인 실행 파일
 * 실행: npx tsx scripts/crawlers/run.ts
 * 또는: npm run crawl
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { crawlKict } from './kict';
import { crawlKfi } from './kfi';
import { crawlLaw } from './law';
import type { CrawlItem, CrawlResult } from './types';

// .env.local 직접 로드 (dotenv 없이)
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

const SOURCE_LABELS: Record<string, string> = {
  kict: '건기원 내화채움구조 인정서',
  kfi: 'KFI 방화포 성능인증',
  law: '법제처 법령 개정',
};

async function sendNewItemsAlert(results: CrawlResult[]) {
  const newResults = results.filter(r => r.status === 'success' && r.new_items > 0);
  if (newResults.length === 0) return;

  const rows = newResults.map(r =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${SOURCE_LABELS[r.source] ?? r.source}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:600;color:#014A99;">${r.new_items}건</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#222;">
      <h2 style="color:#014A99;margin-bottom:4px;">크롤러 신규 항목 알림</h2>
      <p style="color:#666;font-size:14px;margin-top:0;">아래 소스에서 새로운 정보가 수집되었습니다.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;">
        <thead>
          <tr style="background:#f5f7fa;">
            <th style="padding:8px 12px;text-align:left;color:#555;">소스</th>
            <th style="padding:8px 12px;text-align:center;color:#555;">신규</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#999;">
        확인: <a href="https://topdignus.co.kr/dashboard/crawler" style="color:#014A99;">대시보드 → 법령·인정 현황</a>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: '탑디뉴스 크롤러 <no-reply@topdignus.co.kr>',
    to: 'topdi@topdignus.co.kr',
    subject: `[탑디뉴스] 신규 항목 ${newResults.reduce((s, r) => s + r.new_items, 0)}건 수집됨`,
    html,
  });

  console.log(`\n알림 메일 발송 → topdi@topdignus.co.kr`);
}

async function saveItems(items: CrawlItem[]): Promise<number> {
  if (items.length === 0) return 0;

  // 법령은 개정 시 날짜 업데이트 필요 → ignoreDuplicates: false
  // KICT/KFI는 중복 무시 (신규만 카운트)
  const lawItems = items.filter((i) => i.source === 'law');
  const otherItems = items.filter((i) => i.source !== 'law');

  let newCount = 0;

  if (otherItems.length > 0) {
    const { error, data } = await supabase
      .from('crawl_items')
      .upsert(otherItems, { onConflict: 'source,external_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`DB 저장 실패: ${error.message}`);
    newCount += data?.length ?? 0;
  }

  if (lawItems.length > 0) {
    const { error, data } = await supabase
      .from('crawl_items')
      .upsert(lawItems, { onConflict: 'source,external_id', ignoreDuplicates: false })
      .select('id');
    if (error) throw new Error(`DB 저장 실패 (law): ${error.message}`);
    newCount += data?.length ?? 0;
  }

  return newCount;
}

async function logResult(result: CrawlResult) {
  await supabase.from('crawler_logs').insert({
    source: result.source,
    status: result.status,
    items_collected: result.items_collected,
    new_items: result.new_items,
    error_message: result.error_message ?? null,
  });
}

function saveLocalLog(results: CrawlResult[], startedAt: Date) {
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  const dateStr = startedAt.toISOString().slice(0, 10); // YYYY-MM-DD
  const logFile = path.join(logsDir, `crawl-${dateStr}.json`);

  const entry = {
    ran_at: startedAt.toISOString(),
    results,
  };

  // 같은 날 여러 번 실행되면 배열에 append
  let existing: typeof entry[] = [];
  if (fs.existsSync(logFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  existing.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`\n로그 저장: logs/crawl-${dateStr}.json`);
}

async function runCrawler(
  source: string,
  crawlFn: () => Promise<CrawlItem[]>
): Promise<CrawlResult> {
  console.log(`\n===== ${source.toUpperCase()} 크롤링 시작 =====`);
  try {
    const items = await crawlFn();
    const newCount = await saveItems(items);

    const result: CrawlResult = {
      source,
      status: 'success',
      items_collected: items.length,
      new_items: newCount,
    };

    console.log(`[${source}] 완료 — 수집: ${items.length}건, 신규: ${newCount}건`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${source}] 실패:`, message);

    return {
      source,
      status: 'failed',
      items_collected: 0,
      new_items: 0,
      error_message: message,
    };
  }
}

async function main() {
  const startedAt = new Date();
  console.log('크롤러 시작:', startedAt.toLocaleString('ko-KR'));

  const results: CrawlResult[] = [];

  // KICT 크롤링
  results.push(await runCrawler('kict', crawlKict));

  // KFI 크롤링 (방화포)
  results.push(await runCrawler('kfi', crawlKfi));

  // 법제처 크롤링 (건축법/소방법 개정)
  results.push(await runCrawler('law', crawlLaw));

  // DB 로그 저장
  for (const result of results) {
    await logResult(result);
  }

  // 로컬 파일 로그 저장
  saveLocalLog(results, startedAt);

  // 신규 항목 있으면 메일 알림
  await sendNewItemsAlert(results);

  // 최종 요약
  console.log('\n===== 실행 결과 =====');
  for (const r of results) {
    const icon = r.status === 'success' ? '✓' : '✗';
    console.log(`${icon} ${r.source}: 수집 ${r.items_collected}건, 신규 ${r.new_items}건`);
    if (r.error_message) console.log(`  └ 오류: ${r.error_message}`);
  }

  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('크롤러 오류:', err);
  process.exit(1);
});
