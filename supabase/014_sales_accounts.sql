-- 영업 거래처 테이블
CREATE TABLE IF NOT EXISTS sales_accounts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  email        TEXT,
  notes        TEXT,
  priority     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 DB 마이그레이션
ALTER TABLE sales_accounts ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

-- updated_at 트리거 (update_updated_at() 함수는 002_orders.sql에서 정의됨)
DROP TRIGGER IF EXISTS update_sales_accounts_updated_at ON sales_accounts;
CREATE TRIGGER update_sales_accounts_updated_at
  BEFORE UPDATE ON sales_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- sales_leads에 account_id FK 컬럼 추가 (시공사 연결)
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES sales_accounts(id) ON DELETE SET NULL;
