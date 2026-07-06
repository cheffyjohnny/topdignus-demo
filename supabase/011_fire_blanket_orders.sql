CREATE TABLE IF NOT EXISTS fire_blanket_orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no          TEXT,
  manufacturer      TEXT          NOT NULL,
  customer_name     TEXT,
  project           TEXT,
  delivery_location TEXT,
  address           TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  order_date        DATE,
  delivery_date     DATE,
  author            TEXT,
  notes             TEXT,
  delivery_dest     TEXT,
  items             JSONB         NOT NULL DEFAULT '[]',
  status            TEXT          NOT NULL DEFAULT '수주' CHECK (status IN ('수주', '발주', '납품', '취소')),
  status_history    JSONB         DEFAULT '[]',
  image_url         TEXT,
  file_urls         TEXT[]        NOT NULL DEFAULT '{}',
  sale_amount       NUMERIC(14,0) NOT NULL DEFAULT 0,
  purchase_amount   NUMERIC(14,0) NOT NULL DEFAULT 0,
  freight           NUMERIC(14,0) NOT NULL DEFAULT 0,
  resend_id         TEXT,
  no_invoice        BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 기존 DB 마이그레이션
ALTER TABLE fire_blanket_orders ADD COLUMN IF NOT EXISTS no_invoice BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fire_blanket_orders ADD COLUMN IF NOT EXISTS file_urls  TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS fire_blanket_orders_manufacturer_idx ON fire_blanket_orders (manufacturer);
CREATE INDEX IF NOT EXISTS fire_blanket_orders_status_idx       ON fire_blanket_orders (status);
CREATE INDEX IF NOT EXISTS fire_blanket_orders_created_at_idx   ON fire_blanket_orders (created_at DESC);

DROP TRIGGER IF EXISTS fire_blanket_orders_updated_at ON fire_blanket_orders;
CREATE TRIGGER fire_blanket_orders_updated_at
  BEFORE UPDATE ON fire_blanket_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
