CREATE TABLE IF NOT EXISTS fire_blanket_quotes (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no          TEXT,
  manufacturer      TEXT,
  customer_name     TEXT,
  project           TEXT,
  delivery_location TEXT,
  address           TEXT,
  delivery_dest     TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  order_date        DATE,
  delivery_date     DATE,
  author            TEXT,
  notes             TEXT,
  items             JSONB         NOT NULL DEFAULT '[]',
  status            TEXT          NOT NULL DEFAULT '검토중',
  status_history    JSONB         NOT NULL DEFAULT '[]',
  image_url         TEXT,
  file_urls         TEXT[]        NOT NULL DEFAULT '{}',
  sale_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fire_blanket_quotes_created_at_idx ON fire_blanket_quotes(created_at DESC);

DROP TRIGGER IF EXISTS fire_blanket_quotes_updated_at ON fire_blanket_quotes;
CREATE TRIGGER fire_blanket_quotes_updated_at
  BEFORE UPDATE ON fire_blanket_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
