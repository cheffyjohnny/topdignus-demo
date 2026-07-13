create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  email      text unique not null,
  password   text not null,           -- bcrypt 해시
  name       text,
  role       text default 'admin',    -- 'admin' | 'dealer' | 'subscriber'
  created_at timestamptz default now()
);

-- admin 계정은 demo_seed.sql에서 생성 (demo / password)
