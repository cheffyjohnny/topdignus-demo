-- 수집된 항목 저장
create table if not exists crawl_items (
  id            uuid default gen_random_uuid() primary key,
  source        text not null,        -- 'kict' | 'kfi' | 'law'
  type          text,                 -- 신규인정 | 인정변경 | 인정취소 (kict)
  title         text not null,
  external_id   text,                 -- 원본 사이트 ID (중복 방지용)
  department    text,
  announced_at  date,
  has_file      boolean default false,
  source_url    text,
  created_at    timestamptz default now(),
  unique(source, external_id)
);

-- 크롤러 실행 로그
create table if not exists crawler_logs (
  id               uuid default gen_random_uuid() primary key,
  source           text not null,
  ran_at           timestamptz default now(),
  status           text not null,     -- 'success' | 'failed'
  items_collected  integer default 0,
  new_items        integer default 0,
  error_message    text
);

-- 뉴스레터 구독자
create table if not exists newsletter_subscribers (
  id            uuid default gen_random_uuid() primary key,
  email         text unique not null,
  name          text,
  company       text,
  status        text default 'pending',  -- 'pending' | 'active' | 'rejected'
  requested_at  timestamptz default now(),
  approved_at   timestamptz
);

-- RLS 설정
alter table crawl_items enable row level security;
alter table crawler_logs enable row level security;
alter table newsletter_subscribers enable row level security;

-- 정책 (중복 방지)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'crawl_items' and policyname = 'crawl_items_read'
  ) then
    create policy "crawl_items_read" on crawl_items
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'crawl_items' and policyname = 'crawl_items_write'
  ) then
    create policy "crawl_items_write" on crawl_items
      for all using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'crawler_logs' and policyname = 'crawler_logs_all'
  ) then
    create policy "crawler_logs_all" on crawler_logs
      for all using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'newsletter_subscribers' and policyname = 'newsletter_insert'
  ) then
    create policy "newsletter_insert" on newsletter_subscribers
      for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'newsletter_subscribers' and policyname = 'newsletter_manage'
  ) then
    create policy "newsletter_manage" on newsletter_subscribers
      for select using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'newsletter_subscribers' and policyname = 'newsletter_update'
  ) then
    create policy "newsletter_update" on newsletter_subscribers
      for update using (auth.role() = 'service_role');
  end if;
end $$;
