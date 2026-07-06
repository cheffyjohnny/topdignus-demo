-- sales_leads 테이블 (영업대상 현황)
CREATE TABLE IF NOT EXISTS sales_leads (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  seq                  INTEGER,
  dealership           TEXT,
  project_name         TEXT,
  address              TEXT,
  last_visit_date      TEXT,
  construction_company TEXT,
  facility_company     TEXT,
  contact_name         TEXT,
  contact_phone        TEXT,
  scale                TEXT,
  notes                TEXT,
  source_url           TEXT,
  status               TEXT        NOT NULL DEFAULT '등록',
  status_history       JSONB       NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 DB 마이그레이션 (컬럼 누락 대비)
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS seq INTEGER;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS last_update TIMESTAMPTZ;

-- 이전 버전에서 별도 테이블로 만들었던 경우 제거
DROP TABLE IF EXISTS sales_lead_history;

-- seq 백필: created_at 순으로 1부터 부여 (이미 있는 레코드는 skip)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM sales_leads
  WHERE seq IS NULL
)
UPDATE sales_leads sl
SET seq = o.rn
FROM ordered o
WHERE sl.id = o.id;

-- status_history 백필: created_at 기준 최초 '등록' 이력 (이미 있는 레코드는 skip)
UPDATE sales_leads
SET status_history = jsonb_build_array(
  jsonb_build_object('from_status', NULL, 'to_status', '등록', 'changed_at', created_at)
)
WHERE status_history = '[]'::jsonb;
