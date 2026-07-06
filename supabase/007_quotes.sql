CREATE TABLE IF NOT EXISTS pipe_quotes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no           TEXT,
  vendor             TEXT        NOT NULL,
  order_client       TEXT,
  project            TEXT,
  delivery_location  TEXT,
  address            TEXT,
  delivery_dest      TEXT,
  contact_name       TEXT,
  contact_phone      TEXT,
  order_date         DATE,
  delivery_date      DATE,
  author             TEXT,
  notes              TEXT,
  manufacturer       TEXT        NOT NULL DEFAULT '필립산업',
  items              JSONB       NOT NULL DEFAULT '[]',
  status             TEXT        NOT NULL DEFAULT '검토중' CHECK (status IN ('검토중', '검토완료', '송부완료', '수주확정', '취소')),
  status_history     JSONB       NOT NULL DEFAULT '[]',
  image_url          TEXT,
  file_urls          TEXT[]      NOT NULL DEFAULT '{}',
  converted_order_id UUID REFERENCES pipe_orders(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS duct_quotes (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no                TEXT,
  manufacturer            TEXT        NOT NULL,
  customer_name           TEXT,
  project                 TEXT,
  delivery_location       TEXT,
  address                 TEXT,
  delivery_dest           TEXT,
  contact_name            TEXT,
  contact_phone           TEXT,
  order_date              DATE,
  delivery_date           DATE,
  author                  TEXT,
  notes                   TEXT,
  items                   JSONB       NOT NULL DEFAULT '[]',
  status                  TEXT        NOT NULL DEFAULT '검토중' CHECK (status IN ('검토중', '검토완료', '송부완료', '수주확정', '취소')),
  status_history          JSONB       NOT NULL DEFAULT '[]',
  image_url               TEXT,
  file_urls               TEXT[]      NOT NULL DEFAULT '{}',
  converted_duct_order_id UUID REFERENCES duct_orders(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS pipe_quotes_updated_at ON pipe_quotes;
CREATE TRIGGER pipe_quotes_updated_at
  BEFORE UPDATE ON pipe_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS duct_quotes_updated_at ON duct_quotes;
CREATE TRIGGER duct_quotes_updated_at
  BEFORE UPDATE ON duct_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 기존 DB 마이그레이션
ALTER TABLE pipe_quotes ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';
ALTER TABLE pipe_quotes ADD COLUMN IF NOT EXISTS quote_no  TEXT;
ALTER TABLE duct_quotes ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';
ALTER TABLE duct_quotes ADD COLUMN IF NOT EXISTS quote_no  TEXT;

-- status 값 변환 후 CHECK 제약 교체 (진행중/완료/취소 → 검토중/검토완료/송부완료/수주확정/취소)
DO $$
BEGIN
  UPDATE pipe_quotes SET status = '검토중'   WHERE status = '진행중';
  UPDATE pipe_quotes SET status = '수주확정'  WHERE status = '완료';
  UPDATE duct_quotes SET status = '검토중'   WHERE status = '진행중';
  UPDATE duct_quotes SET status = '수주확정'  WHERE status = '완료';

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipe_quotes_status_check' AND contype = 'c') THEN
    ALTER TABLE pipe_quotes DROP CONSTRAINT pipe_quotes_status_check;
    ALTER TABLE pipe_quotes ADD CONSTRAINT pipe_quotes_status_check
      CHECK (status IN ('검토중', '검토완료', '송부완료', '수주확정', '취소'));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'duct_quotes_status_check' AND contype = 'c') THEN
    ALTER TABLE duct_quotes DROP CONSTRAINT duct_quotes_status_check;
    ALTER TABLE duct_quotes ADD CONSTRAINT duct_quotes_status_check
      CHECK (status IN ('검토중', '검토완료', '송부완료', '수주확정', '취소'));
  END IF;
END $$;

-- quote_groups 테이블 (배관·덕트 복합 견적서 그룹)
CREATE TABLE IF NOT EXISTS quote_groups (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor         TEXT        NOT NULL    DEFAULT '',
  project        TEXT,
  order_date     DATE,
  author         TEXT,
  notes          TEXT,
  status         TEXT        NOT NULL    DEFAULT '검토중',
  status_history JSONB       NOT NULL    DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL    DEFAULT now()
);

-- pipe_quotes / duct_quotes 에 group_id FK 추가
ALTER TABLE pipe_quotes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES quote_groups(id) ON DELETE SET NULL;
ALTER TABLE duct_quotes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES quote_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipe_quotes_group_id ON pipe_quotes(group_id);
CREATE INDEX IF NOT EXISTS idx_duct_quotes_group_id ON duct_quotes(group_id);
