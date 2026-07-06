-- 기존 prices 테이블 이름 변경 (이미 pipe_prices인 경우 skip)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prices' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipe_prices' AND table_schema = 'public') THEN
    ALTER TABLE prices RENAME TO pipe_prices;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pipe_prices (
  manufacturer   TEXT          NOT NULL DEFAULT '필립산업',
  prod_key       TEXT          NOT NULL,
  internal_name  TEXT          NOT NULL,
  pipe_spec      TEXT,
  sleeve_spec    TEXT,
  unit_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  heat_type      TEXT[],
  heat_length_mm NUMERIC,
  sealant_volume TEXT,
  note           TEXT,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (manufacturer, prod_key)
);

-- 기존 DB 마이그레이션
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS nego_price;
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS sale_price;
ALTER TABLE pipe_prices ADD COLUMN IF NOT EXISTS manufacturer TEXT NOT NULL DEFAULT '필립산업';
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS heat_components;
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS heat_count;
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS heat_price;
ALTER TABLE pipe_prices DROP COLUMN IF EXISTS sealant_price;

-- heat_type TEXT → TEXT[] 변환 (이미 배열이면 skip)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipe_prices' AND column_name = 'heat_type'
      AND table_schema = 'public'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE pipe_prices
      ALTER COLUMN heat_type TYPE TEXT[]
      USING CASE WHEN heat_type IS NOT NULL THEN ARRAY[heat_type] ELSE NULL END;
  END IF;
END $$;

-- 구 단일 PK(prod_key) → 복합 PK(manufacturer, prod_key) 변경
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'pipe_prices'
      AND column_name = 'manufacturer'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'pipe_prices' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE pipe_prices DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'pipe_prices' AND constraint_type = 'PRIMARY KEY'
      LIMIT 1
    );
    ALTER TABLE pipe_prices ADD PRIMARY KEY (manufacturer, prod_key);
  END IF;
END $$;

DROP TRIGGER IF EXISTS pipe_prices_updated_at ON pipe_prices;
CREATE TRIGGER pipe_prices_updated_at
  BEFORE UPDATE ON pipe_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
