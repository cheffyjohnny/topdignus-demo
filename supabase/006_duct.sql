CREATE TABLE IF NOT EXISTS duct_prices (
  manufacturer  TEXT        PRIMARY KEY,
  price_type    TEXT        NOT NULL CHECK (price_type IN ('per_m', 'per_item')),
  riser_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  wall_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  insul_50t_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  insul_25t_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO duct_prices (manufacturer, price_type, riser_price, wall_price)
VALUES ('프로화이어', 'per_m', 0, 0)
ON CONFLICT (manufacturer) DO NOTHING;

-- 필립산업은 개당 단가를 매번 문의로 취득하므로 DB 관리 불필요
DELETE FROM duct_prices WHERE manufacturer = '필립산업';

CREATE TABLE IF NOT EXISTS duct_sale_prices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer    TEXT        NOT NULL REFERENCES duct_prices(manufacturer) ON DELETE CASCADE,
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  riser_sale_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  wall_sale_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  insul_50t_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  insul_25t_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manufacturer, customer_id)
);

-- 기존 DB 마이그레이션
ALTER TABLE customers       DROP COLUMN IF EXISTS duct_riser_sale_price;
ALTER TABLE customers       DROP COLUMN IF EXISTS duct_wall_sale_price;
ALTER TABLE duct_prices     ADD COLUMN IF NOT EXISTS insul_50t_price   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE duct_prices     ADD COLUMN IF NOT EXISTS insul_25t_price   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE duct_prices     ADD COLUMN IF NOT EXISTS sort_order        INTEGER;
ALTER TABLE duct_sale_prices ADD COLUMN IF NOT EXISTS insul_50t_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE duct_sale_prices ADD COLUMN IF NOT EXISTS insul_25t_sale_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- sort_order 백필 (기존 데이터)
WITH ranked AS (
  SELECT manufacturer, ROW_NUMBER() OVER (ORDER BY manufacturer) AS rn
  FROM duct_prices
  WHERE sort_order IS NULL
)
UPDATE duct_prices
SET sort_order = ranked.rn
FROM ranked
WHERE duct_prices.manufacturer = ranked.manufacturer;

-- updated_at 자동 갱신 triggers
DROP TRIGGER IF EXISTS duct_prices_updated_at ON duct_prices;
CREATE TRIGGER duct_prices_updated_at
  BEFORE UPDATE ON duct_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS duct_sale_prices_updated_at ON duct_sale_prices;
CREATE TRIGGER duct_sale_prices_updated_at
  BEFORE UPDATE ON duct_sale_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
