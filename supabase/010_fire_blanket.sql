-- fire_blanket_prices: (manufacturer, item_name) 복합 PK
CREATE TABLE IF NOT EXISTS fire_blanket_prices (
  manufacturer  TEXT          NOT NULL,
  item_name     TEXT          NOT NULL DEFAULT '',
  spec          TEXT          NOT NULL DEFAULT '',
  roll_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- fire_blanket_sale_prices: FK는 아래 ALTER TABLE로 추가 (멱등성 확보)
CREATE TABLE IF NOT EXISTS fire_blanket_sale_prices (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer    TEXT          NOT NULL,
  item_name       TEXT          NOT NULL DEFAULT '',
  customer_id     UUID          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  roll_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 기존 DB 마이그레이션: 컬럼 추가
ALTER TABLE fire_blanket_prices ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '';
ALTER TABLE fire_blanket_prices ADD COLUMN IF NOT EXISTS spec     TEXT NOT NULL DEFAULT '';
ALTER TABLE fire_blanket_sale_prices ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '';

-- 기존 DB 마이그레이션: 구 PK(manufacturer 단독) → 복합 PK(manufacturer, item_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_name = 'fire_blanket_prices'
      AND column_name = 'item_name'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'fire_blanket_prices' AND constraint_type = 'PRIMARY KEY'
      )
  ) THEN
    -- 기존 PK 있으면 제거 후 복합 PK로 교체, 없으면 신규 추가
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'fire_blanket_prices' AND constraint_type = 'PRIMARY KEY'
    ) THEN
      EXECUTE (
        SELECT 'ALTER TABLE fire_blanket_prices DROP CONSTRAINT ' || constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'fire_blanket_prices' AND constraint_type = 'PRIMARY KEY'
        LIMIT 1
      );
    END IF;
    ALTER TABLE fire_blanket_prices ADD PRIMARY KEY (manufacturer, item_name);
  END IF;
END $$;

-- 기존 DB 마이그레이션: 구 FK/UNIQUE 제거 후 새 형식으로 재추가
ALTER TABLE fire_blanket_sale_prices DROP CONSTRAINT IF EXISTS fire_blanket_sale_prices_manufacturer_fkey;
ALTER TABLE fire_blanket_sale_prices DROP CONSTRAINT IF EXISTS fire_blanket_sale_prices_mfr_item_fkey;
ALTER TABLE fire_blanket_sale_prices DROP CONSTRAINT IF EXISTS fire_blanket_sale_prices_manufacturer_customer_id_key;
ALTER TABLE fire_blanket_sale_prices DROP CONSTRAINT IF EXISTS fire_blanket_sale_prices_mfr_item_customer_unique;

-- FK: (manufacturer, item_name) → fire_blanket_prices, ON UPDATE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fire_blanket_sale_prices_mfr_item_fkey'
      AND conrelid = 'fire_blanket_sale_prices'::regclass
  ) THEN
    ALTER TABLE fire_blanket_sale_prices
      ADD CONSTRAINT fire_blanket_sale_prices_mfr_item_fkey
      FOREIGN KEY (manufacturer, item_name)
      REFERENCES fire_blanket_prices(manufacturer, item_name)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- UNIQUE: (manufacturer, item_name, customer_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fire_blanket_sale_prices_mfr_item_customer_unique'
      AND conrelid = 'fire_blanket_sale_prices'::regclass
  ) THEN
    ALTER TABLE fire_blanket_sale_prices
      ADD CONSTRAINT fire_blanket_sale_prices_mfr_item_customer_unique
      UNIQUE (manufacturer, item_name, customer_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS fire_blanket_prices_updated_at ON fire_blanket_prices;
CREATE TRIGGER fire_blanket_prices_updated_at
  BEFORE UPDATE ON fire_blanket_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS fire_blanket_sale_prices_updated_at ON fire_blanket_sale_prices;
CREATE TRIGGER fire_blanket_sale_prices_updated_at
  BEFORE UPDATE ON fire_blanket_sale_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
