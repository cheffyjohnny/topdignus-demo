-- pipe_orders 테이블 (배관 수주서)
CREATE TABLE IF NOT EXISTS pipe_orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor            TEXT          NOT NULL,
  project           TEXT,
  delivery_location TEXT,
  address           TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  order_date        DATE,
  delivery_date     DATE,
  author            TEXT,
  manufacturer      TEXT          NOT NULL DEFAULT '필립산업',
  notes             TEXT,
  delivery_dest     TEXT,
  order_client      TEXT,
  order_no          TEXT,
  status            TEXT          NOT NULL DEFAULT '수주' CHECK (status IN ('수주', '발주', '납품', '취소')),
  items             JSONB         NOT NULL DEFAULT '[]',
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
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS manufacturer    TEXT NOT NULL DEFAULT '필립산업';
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS sale_amount     NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS freight         NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS resend_id       TEXT;
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS no_invoice      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS file_urls       TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS pipe_orders_vendor_idx     ON pipe_orders (vendor);
CREATE INDEX IF NOT EXISTS pipe_orders_status_idx     ON pipe_orders (status);
CREATE INDEX IF NOT EXISTS pipe_orders_created_at_idx ON pipe_orders (created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipe_orders_updated_at ON pipe_orders;
CREATE TRIGGER pipe_orders_updated_at
  BEFORE UPDATE ON pipe_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- duct_orders 테이블 (사각덕트 수주서)
CREATE TABLE IF NOT EXISTS duct_orders (
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
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS sale_amount     NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS freight         NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS resend_id       TEXT;
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS no_invoice      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS file_urls       TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS duct_orders_manufacturer_idx ON duct_orders (manufacturer);
CREATE INDEX IF NOT EXISTS duct_orders_status_idx       ON duct_orders (status);
CREATE INDEX IF NOT EXISTS duct_orders_created_at_idx   ON duct_orders (created_at DESC);

DROP TRIGGER IF EXISTS duct_orders_updated_at ON duct_orders;
CREATE TRIGGER duct_orders_updated_at
  BEFORE UPDATE ON duct_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage 버킷: 발주 이미지
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage 버킷: 발주서 PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-pdfs', 'order-pdfs', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow upload order images') THEN
    CREATE POLICY "allow upload order images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow read order images') THEN
    CREATE POLICY "allow read order images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'order-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='service role upload order images') THEN
    CREATE POLICY "service role upload order images" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'order-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow upload order pdfs') THEN
    CREATE POLICY "allow upload order pdfs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order-pdfs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow read order pdfs') THEN
    CREATE POLICY "allow read order pdfs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'order-pdfs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public read order pdfs') THEN
    CREATE POLICY "public read order pdfs" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'order-pdfs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='service role upload order pdfs') THEN
    CREATE POLICY "service role upload order pdfs" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'order-pdfs');
  END IF;
END $$;

-- order_groups 테이블 (배관·덕트 복합 수주서 그룹)
CREATE TABLE IF NOT EXISTS order_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor            TEXT        NOT NULL,
  order_client      TEXT,
  project           TEXT,
  address           TEXT,
  delivery_location TEXT,
  delivery_dest     TEXT,
  contact_name      TEXT,
  contact_phone     TEXT,
  order_date        DATE,
  author            TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS order_groups_updated_at ON order_groups;
CREATE TRIGGER order_groups_updated_at
  BEFORE UPDATE ON order_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS order_groups_vendor_idx     ON order_groups (vendor);
CREATE INDEX IF NOT EXISTS order_groups_created_at_idx ON order_groups (created_at DESC);

-- pipe_orders / duct_orders 에 group_id 추가
ALTER TABLE pipe_orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES order_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pipe_orders_group_id_idx ON pipe_orders (group_id);

ALTER TABLE duct_orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES order_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS duct_orders_group_id_idx ON duct_orders (group_id);
