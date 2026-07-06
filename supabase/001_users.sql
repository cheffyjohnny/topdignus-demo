create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  email      text unique not null,
  password   text not null,           -- bcrypt 해시
  name       text,
  role       text default 'admin',    -- 'admin' | 'dealer' | 'subscriber'
  created_at timestamptz default now()
);

-- 초기 admin 계정 username 세팅 (이미 있으면 skip)
update users set username = 'topdi' where role = 'admin' and username is null;

-- admin 계정 시드 (없을 때만 삽입, 재실행 안전)
-- 초기 비밀번호: password (로그인 후 /dashboard/settings에서 변경 권장)
insert into users (username, email, password, name, role)
values ('topdi', 'topdi@topdignus.co.kr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uMpF4tK8i', '탑디뉴스', 'admin')
on conflict (email) do nothing;
