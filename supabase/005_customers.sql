-- 거래처 테이블
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  sale_pct integer NOT NULL DEFAULT 55,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 기존 테이블 마이그레이션 (grade → discount_pct → sale_pct)
DO $$
BEGIN
  -- grade → sale_pct
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'grade'
  ) THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS sale_pct integer NOT NULL DEFAULT 55;
    UPDATE customers SET sale_pct = CASE grade WHEN 'A' THEN 55 WHEN 'B' THEN 65 ELSE 55 END;
    ALTER TABLE customers DROP COLUMN grade;
  END IF;
  -- discount_pct → sale_pct
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'discount_pct'
  ) THEN
    ALTER TABLE customers RENAME COLUMN discount_pct TO sale_pct;
  END IF;
END $$;

-- 기존 거래처 시드
INSERT INTO customers (name, sale_pct, email) VALUES
  ('피앤지', 55, 'cu8282@naver.com')
ON CONFLICT (name) DO NOTHING;

-- updated_at 자동 갱신 trigger
DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화 (anon 키 직접 접근 차단, 서버는 service role로 우회)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
