-- =============================================================
-- Topdignus Demo Seed Data
-- All data is fictional and for demonstration purposes only.
-- Run this file AFTER all migration files (001–014) have been executed.
-- Login: username = demo / password = password
-- =============================================================

-- ──────────────────────────────────────────
-- 1. Demo admin account
-- ──────────────────────────────────────────
INSERT INTO users (username, email, password, name, role)
VALUES ('demo', 'demo@topdignus.co.kr', '$2b$10$XVMlRcF9cOTrJXx7nLZPseVf8S29LyIbRc1q9O/dk3ET5ON/t90ce', 'Topdignus Demo', 'admin')
ON CONFLICT (email) DO NOTHING;


-- ──────────────────────────────────────────
-- 2. Customers (거래처)
-- ──────────────────────────────────────────
INSERT INTO customers (name, sale_pct, email) VALUES
  ('Horizon Construction Group',  55, 'order@horizoncg.com.au'),
  ('Pacific Building Solutions',  65, 'purchase@pacificbs.com.au'),
  ('Metro Contractors Pty Ltd',   55, 'info@metrocontractors.com.au'),
  ('Summit Engineering Co.',      65, 'orders@summiteng.com.au'),
  ('Apex Infrastructure Group',   55, 'supply@apexinfra.com.au')
ON CONFLICT (name) DO NOTHING;


-- ──────────────────────────────────────────
-- 3. Sales accounts (영업 거래처)
-- ──────────────────────────────────────────
INSERT INTO sales_accounts (name, contact_name, contact_phone, email, notes, priority) VALUES
  ('Eastern Contractors Pty Ltd',     'James Wilson',    '02-9000-1001', 'j.wilson@easternc.com.au',  'Key partner — quarterly meetings scheduled',         5),
  ('Pacific Plumbing & Fire',         'Sarah Thompson',  '02-9000-1002', 's.thompson@ppf.com.au',     'Direct contact with site manager secured',           3),
  ('Urban Build Group',               'Michael Chen',    '03-9000-1003', 'm.chen@urbanbuild.com.au',  'Frequent quote requests, previous supply history',   4),
  ('National Fire Protection Co.',    'Emily Davis',     '07-9000-1004', 'e.davis@nfpc.com.au',       'New lead — currently in negotiation',                2),
  ('Allied Construction Services',   'Robert Kim',      '08-9000-1005', 'r.kim@alliedcs.com.au',     'Specialised fire-resistance installation team',      4),
  ('Premier Building Solutions',      'David Park',      '02-9000-1006', 'd.park@premierbs.com.au',   'Large-scale projects, price negotiation required',   3);


-- ──────────────────────────────────────────
-- 4. Pipe / duct prices (단가표 — new-order dropdowns need these)
-- ──────────────────────────────────────────
INSERT INTO pipe_prices (manufacturer, prod_key, internal_name, pipe_spec, sleeve_spec, unit_price) VALUES
  ('Philip Industries', '입상_PVC_고정구_일체형_50A_150A',  '입상_PVC_고정구_일체형', '50A',  '150A', 42000),
  ('Philip Industries', '입상_PVC_고정구_일체형_75A_175A',  '입상_PVC_고정구_일체형', '75A',  '175A', 50000),
  ('Philip Industries', '입상_PVC_고정구_일체형_100A_200A', '입상_PVC_고정구_일체형', '100A', '200A', 62000),
  ('Philip Industries', '입상_PVC_고정틀_50A_150A',        '입상_PVC_고정틀',        '50A',  '150A', 38000),
  ('Philip Industries', '입상_PVC_고정틀_100A_200A',       '입상_PVC_고정틀',        '100A', '200A', 58000),
  ('Philip Industries', '입상_SU_고정틀_100A_200A',        '입상_SU_고정틀',         '100A', '200A', 65000),
  ('Philip Industries', '입상_SU_충진재_50A_150A',         '입상_SU_충진재',         '50A',  '150A', 32000),
  ('Philip Industries', '입상_강관_고정구_일체형_50A_150A', '입상_강관_고정구_일체형', '50A',  '150A', 45000),
  ('Philip Industries', '입상_강관_고정구_일체형_65A_175A', '입상_강관_고정구_일체형', '65A',  '175A', 58000),
  ('Philip Industries', '벽체_PVC_50A_150A',               '벽체_PVC',               '50A',  '150A', 35000),
  ('Philip Industries', '벽체_PVC_75A_175A',               '벽체_PVC',               '75A',  '175A', 42000),
  ('Philip Industries', '벽체_SU_75A_175A',                '벽체_SU',                '75A',  '175A', 55000),
  ('Philip Industries', '벽체_강관_50A_150A',              '벽체_강관',              '50A',  '150A', 38000),
  ('Philip Industries', '벽체_강관_65A_175A',              '벽체_강관',              '65A',  '175A', 48000),
  ('Philip Industries', '실란트_310ml',                    '실란트',                 '310ml', NULL,  8000),
  ('Philip Industries', '차열재_50T×400×3600',             '차열재',                 '50T×400×3600', NULL, 48000)
ON CONFLICT (manufacturer, prod_key) DO NOTHING;

INSERT INTO duct_prices (manufacturer, price_type, riser_price, wall_price, insul_50t_price, insul_25t_price, sort_order) VALUES
  ('ProFire',         'per_m',    180000, 250000, 45000, 30000, 1),
  ('Kings Asia Metal','per_item', 200000, 280000, 0,     0,     2)
ON CONFLICT (manufacturer) DO NOTHING;


-- ──────────────────────────────────────────
-- 5. Pipe orders (배관 수주서)
-- ──────────────────────────────────────────

-- Delivered (납품) — 4 orders
INSERT INTO pipe_orders (vendor, project, delivery_location, address, contact_name, contact_phone, order_date, delivery_date, author, manufacturer, order_no, status, sale_amount, purchase_amount, freight, items, status_history, created_at) VALUES

('Horizon Construction Group', 'Sydney CBD Commercial Tower', 'Sydney NSW', '120 Collins St, Sydney NSW 2000', 'James Wilson', '02-9000-1001',
 '2026-01-08', '2026-01-15', 'Alex Kim', 'Philip Industries', '1-1', '납품', 4250000, 2100000, 150000,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":10,"unitPrice":85000,"manufacturer":"Philip Industries"},
   {"name":"PVC Riser Frame","internalName":"입상_PVC_고정틀","displayName":"PVC Riser Frame","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":8,"unitPrice":120000,"manufacturer":"Philip Industries"},
   {"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":5,"unitPrice":98000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-01-08T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-01-10T14:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-01-15T11:00:00+09:00"}]'::jsonb,
 '2026-01-08 09:00:00+09'),

('Metro Contractors Pty Ltd', 'Melbourne Southbank Apartments', 'Southbank VIC', '45 City Rd, Southbank VIC 3006', 'Michael Chen', '03-9000-1003',
 '2026-02-03', '2026-02-12', 'Sarah Lee', 'Philip Industries', '2-1', '납품', 6800000, 3300000, 200000,
 '[
   {"name":"Steel Riser Integrated Clamp","internalName":"입상_강관_고정구_일체형","displayName":"Steel Riser Integrated Clamp","pipeSpec":"65A","sleeveSpec":"175A","spec":"65A*175A","unit":"pc","quantity":15,"unitPrice":145000,"manufacturer":"Philip Industries"},
   {"name":"PVC Wall Sleeve","internalName":"벽체_PVC","displayName":"PVC Wall Sleeve","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":20,"unitPrice":78000,"manufacturer":"Philip Industries"},
   {"name":"Sealant","internalName":"실란트","displayName":"Sealant 310ml","spec":"310ml","unit":"tube","quantity":10,"unitPrice":12000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-02-03T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-02-05T10:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-02-12T13:00:00+09:00"}]'::jsonb,
 '2026-02-03 09:00:00+09'),

('Apex Infrastructure Group', 'Perth Waterfront Complex', 'Perth WA', '10 The Esplanade, Perth WA 6000', 'David Park', '08-9000-1006',
 '2026-03-10', '2026-03-20', 'Alex Kim', 'Philip Industries', '3-1', '납품', 3900000, 1950000, 100000,
 '[
   {"name":"SUS Riser Frame","internalName":"입상_SU_고정틀","displayName":"SUS Riser Frame","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":12,"unitPrice":135000,"manufacturer":"Philip Industries"},
   {"name":"PVC Wall Sleeve","internalName":"벽체_PVC","displayName":"PVC Wall Sleeve","pipeSpec":"75A","sleeveSpec":"175A","spec":"75A*175A","unit":"pc","quantity":15,"unitPrice":95000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-03-10T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-03-12T11:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-03-20T15:00:00+09:00"}]'::jsonb,
 '2026-03-10 09:00:00+09'),

('Pacific Building Solutions', 'Brisbane Riverside Development', 'Brisbane QLD', '30 Eagle St, Brisbane QLD 4000', 'Sarah Thompson', '02-9000-1002',
 '2026-04-07', '2026-04-16', 'Sarah Lee', 'P&I Corp', '4-1', '납품', 5100000, 2550000, 150000,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":18,"unitPrice":85000,"manufacturer":"P&I Corp"},
   {"name":"Steel Wall Sleeve","internalName":"벽체_강관","displayName":"Steel Wall Sleeve","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":12,"unitPrice":110000,"manufacturer":"P&I Corp"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-04-07T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-04-09T10:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-04-16T14:00:00+09:00"}]'::jsonb,
 '2026-04-07 09:00:00+09'),

-- Ordered (발주) — 4 orders
('Horizon Construction Group', 'Gold Coast High-Rise Tower', 'Gold Coast QLD', '1 Surfers Paradise Blvd, Gold Coast QLD 4217', 'James Wilson', '02-9000-1001',
 '2026-05-12', '2026-06-05', 'Alex Kim', 'Philip Industries', '5-1', '발주', 7200000, 3600000, 200000,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":20,"unitPrice":120000,"manufacturer":"Philip Industries"},
   {"name":"SUS Riser Filler","internalName":"입상_SU_충진재","displayName":"SUS Riser Filler","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":15,"unitPrice":68000,"manufacturer":"Philip Industries"},
   {"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":8,"unitPrice":98000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-05-12T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-05-14T11:00:00+09:00"}]'::jsonb,
 '2026-05-12 09:00:00+09'),

('Metro Contractors Pty Ltd', 'Adelaide Central Market Hub', 'Adelaide SA', '44 Gouger St, Adelaide SA 5000', 'Michael Chen', '03-9000-1003',
 '2026-05-20', '2026-06-15', 'Sarah Lee', 'Philip Industries', '5-2', '발주', 5600000, 2800000, 150000,
 '[
   {"name":"PVC Wall Sleeve","internalName":"벽체_PVC","displayName":"PVC Wall Sleeve","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":25,"unitPrice":78000,"manufacturer":"Philip Industries"},
   {"name":"Steel Riser Integrated Clamp","internalName":"입상_강관_고정구_일체형","displayName":"Steel Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":10,"unitPrice":130000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-05-20T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-05-22T10:00:00+09:00"}]'::jsonb,
 '2026-05-20 09:00:00+09'),

('Apex Infrastructure Group', 'Canberra Government Office Block', 'Canberra ACT', '1 Constitution Ave, Canberra ACT 2600', 'David Park', '08-9000-1006',
 '2026-06-03', '2026-07-01', 'Alex Kim', 'Philip Industries', '6-1', '발주', 9100000, 4550000, 250000,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"75A","sleeveSpec":"175A","spec":"75A*175A","unit":"pc","quantity":30,"unitPrice":105000,"manufacturer":"Philip Industries"},
   {"name":"SUS Riser Frame","internalName":"입상_SU_고정틀","displayName":"SUS Riser Frame","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":15,"unitPrice":135000,"manufacturer":"Philip Industries"},
   {"name":"Sealant","internalName":"실란트","displayName":"Sealant 310ml","spec":"310ml","unit":"tube","quantity":20,"unitPrice":12000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-03T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-06-05T13:00:00+09:00"}]'::jsonb,
 '2026-06-03 09:00:00+09'),

('Summit Engineering Co.', 'Newcastle Industrial Centre', 'Newcastle NSW', '5 Steel St, Newcastle NSW 2300', 'Emily Davis', '07-9000-1004',
 '2026-06-18', '2026-07-10', 'Sarah Lee', 'P&I Corp', '6-3', '발주', 4400000, 2200000, 100000,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":16,"unitPrice":85000,"manufacturer":"P&I Corp"},
   {"name":"Steel Wall Sleeve","internalName":"벽체_강관","displayName":"Steel Wall Sleeve","pipeSpec":"65A","sleeveSpec":"175A","spec":"65A*175A","unit":"pc","quantity":10,"unitPrice":125000,"manufacturer":"P&I Corp"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-18T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-06-19T14:00:00+09:00"}]'::jsonb,
 '2026-06-18 09:00:00+09'),

-- New orders (수주) — 3 orders
('Horizon Construction Group', 'Parramatta Civic Tower', 'Parramatta NSW', '2 Parramatta Square, Parramatta NSW 2150', 'James Wilson', '02-9000-1001',
 '2026-06-25', '2026-07-20', 'Alex Kim', 'Philip Industries', '6-4', '수주', 8500000, 0, 0,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":25,"unitPrice":120000,"manufacturer":"Philip Industries"},
   {"name":"SUS Wall Sleeve","internalName":"벽체_SU","displayName":"SUS Wall Sleeve","pipeSpec":"75A","sleeveSpec":"175A","spec":"75A*175A","unit":"pc","quantity":18,"unitPrice":105000,"manufacturer":"Philip Industries"},
   {"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":10,"unitPrice":98000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-25T09:00:00+09:00"}]'::jsonb,
 '2026-06-25 09:00:00+09'),

('Pacific Building Solutions', 'Wollongong Mixed-Use Development', 'Wollongong NSW', '100 Crown St, Wollongong NSW 2500', 'Sarah Thompson', '02-9000-1002',
 '2026-06-28', '2026-07-25', 'Sarah Lee', 'Philip Industries', '6-5', '수주', 3200000, 0, 0,
 '[
   {"name":"PVC Riser Frame","internalName":"입상_PVC_고정틀","displayName":"PVC Riser Frame","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":20,"unitPrice":95000,"manufacturer":"Philip Industries"},
   {"name":"Sealant","internalName":"실란트","displayName":"Sealant 310ml","spec":"310ml","unit":"tube","quantity":15,"unitPrice":12000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-28T09:00:00+09:00"}]'::jsonb,
 '2026-06-28 09:00:00+09'),

('Metro Contractors Pty Ltd', 'Sydney Olympic Park Arena Expansion', 'Sydney Olympic Park NSW', '1 Olympic Blvd, Sydney Olympic Park NSW 2127', 'Michael Chen', '03-9000-1003',
 '2026-07-01', '2026-08-01', 'Alex Kim', 'Philip Industries', '7-1', '수주', 11200000, 0, 0,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":35,"unitPrice":120000,"manufacturer":"Philip Industries"},
   {"name":"Steel Riser Integrated Clamp","internalName":"입상_강관_고정구_일체형","displayName":"Steel Riser Integrated Clamp","pipeSpec":"65A","sleeveSpec":"175A","spec":"65A*175A","unit":"pc","quantity":20,"unitPrice":145000,"manufacturer":"Philip Industries"},
   {"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":12,"unitPrice":98000,"manufacturer":"Philip Industries"},
   {"name":"Sealant","internalName":"실란트","displayName":"Sealant 310ml","spec":"310ml","unit":"tube","quantity":25,"unitPrice":12000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-07-01T09:00:00+09:00"}]'::jsonb,
 '2026-07-01 09:00:00+09'),

-- Cancelled (취소) — 1 order
('Summit Engineering Co.', 'Hobart Waterfront Hotel', 'Hobart TAS', '15 Salamanca Pl, Hobart TAS 7000', 'Emily Davis', '07-9000-1004',
 '2026-03-01', NULL, 'Sarah Lee', 'Philip Industries', '3-2', '취소', 0, 0, 0,
 '[
   {"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":5,"unitPrice":85000,"manufacturer":"Philip Industries"}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-03-01T09:00:00+09:00"},{"from_status":"수주","to_status":"취소","changed_at":"2026-03-05T10:00:00+09:00"}]'::jsonb,
 '2026-03-01 09:00:00+09');


-- ──────────────────────────────────────────
-- 6. Duct orders (덕트 수주서)
-- ──────────────────────────────────────────
INSERT INTO duct_orders (manufacturer, customer_name, project, delivery_location, address, contact_name, contact_phone, order_date, delivery_date, author, order_no, status, sale_amount, purchase_amount, freight, items, status_history, created_at) VALUES

-- Delivered (납품) — 2 orders
('ProFire', 'Apex Infrastructure Group', 'Sydney CBD Commercial Tower', 'Sydney NSW', '120 Collins St, Sydney NSW 2000', 'David Park', '08-9000-1006',
 '2026-02-10', '2026-02-20', 'Alex Kim', '2-2', '납품', 3850000, 1925000, 120000,
 '[
   {"type":"입상","manufacturer":"ProFire","width":400,"height":300,"quantity":8,"unit_price":217000,"amount":1736000,"note":""},
   {"type":"벽체","manufacturer":"ProFire","width":600,"height":400,"quantity":6,"unit_price":280000,"amount":1680000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-02-10T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-02-12T10:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-02-20T14:00:00+09:00"}]'::jsonb,
 '2026-02-10 09:00:00+09'),

('Kings Asia Metal', 'Horizon Construction Group', 'Gold Coast High-Rise Tower', 'Gold Coast QLD', '1 Surfers Paradise Blvd, Gold Coast QLD 4217', 'James Wilson', '02-9000-1001',
 '2026-04-15', '2026-04-28', 'Sarah Lee', '4-2', '납품', 4200000, 2100000, 150000,
 '[
   {"type":"입상","manufacturer":"Kings Asia Metal","width":500,"height":400,"quantity":10,"unit_price":245000,"amount":2450000,"note":""},
   {"type":"벽체","manufacturer":"Kings Asia Metal","width":800,"height":500,"quantity":5,"unit_price":310000,"amount":1550000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-04-15T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-04-17T11:00:00+09:00"},{"from_status":"발주","to_status":"납품","changed_at":"2026-04-28T15:00:00+09:00"}]'::jsonb,
 '2026-04-15 09:00:00+09'),

-- Ordered (발주) — 2 orders
('ProFire', 'Metro Contractors Pty Ltd', 'Melbourne Southbank Apartments', 'Southbank VIC', '45 City Rd, Southbank VIC 3006', 'Michael Chen', '03-9000-1003',
 '2026-05-22', '2026-06-10', 'Alex Kim', '5-3', '발주', 5100000, 2550000, 150000,
 '[
   {"type":"입상","manufacturer":"ProFire","width":400,"height":400,"quantity":12,"unit_price":232000,"amount":2784000,"note":""},
   {"type":"벽체","manufacturer":"ProFire","width":700,"height":500,"quantity":7,"unit_price":295000,"amount":2065000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-05-22T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-05-24T10:00:00+09:00"}]'::jsonb,
 '2026-05-22 09:00:00+09'),

('Kings Asia Metal', 'Apex Infrastructure Group', 'Canberra Government Office Block', 'Canberra ACT', '1 Constitution Ave, Canberra ACT 2600', 'David Park', '08-9000-1006',
 '2026-06-20', '2026-07-15', 'Sarah Lee', '6-2', '발주', 6800000, 3400000, 200000,
 '[
   {"type":"입상","manufacturer":"Kings Asia Metal","width":600,"height":400,"quantity":15,"unit_price":268000,"amount":4020000,"note":""},
   {"type":"벽체","manufacturer":"Kings Asia Metal","width":900,"height":600,"quantity":6,"unit_price":330000,"amount":1980000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-20T09:00:00+09:00"},{"from_status":"수주","to_status":"발주","changed_at":"2026-06-22T13:00:00+09:00"}]'::jsonb,
 '2026-06-20 09:00:00+09'),

-- New orders (수주) — 2 orders
('ProFire', 'Pacific Building Solutions', 'Parramatta Civic Tower', 'Parramatta NSW', '2 Parramatta Square, Parramatta NSW 2150', 'Sarah Thompson', '02-9000-1002',
 '2026-06-27', '2026-07-25', 'Alex Kim', '6-6', '수주', 4650000, 0, 0,
 '[
   {"type":"입상","manufacturer":"ProFire","width":500,"height":300,"quantity":10,"unit_price":248000,"amount":2480000,"note":""},
   {"type":"벽체","manufacturer":"ProFire","width":600,"height":400,"quantity":7,"unit_price":310000,"amount":2170000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-06-27T09:00:00+09:00"}]'::jsonb,
 '2026-06-27 09:00:00+09'),

('Kings Asia Metal', 'Summit Engineering Co.', 'Wollongong Mixed-Use Development', 'Wollongong NSW', '100 Crown St, Wollongong NSW 2500', 'Emily Davis', '07-9000-1004',
 '2026-07-01', '2026-08-05', 'Sarah Lee', '7-2', '수주', 3200000, 0, 0,
 '[
   {"type":"입상","manufacturer":"Kings Asia Metal","width":400,"height":300,"quantity":8,"unit_price":240000,"amount":1920000,"note":""},
   {"type":"벽체","manufacturer":"Kings Asia Metal","width":700,"height":400,"quantity":4,"unit_price":320000,"amount":1280000,"note":""}
 ]'::jsonb,
 '[{"from_status":null,"to_status":"수주","changed_at":"2026-07-01T09:00:00+09:00"}]'::jsonb,
 '2026-07-01 09:00:00+09');


-- ──────────────────────────────────────────
-- 7. Pipe quotes (배관 견적서)
-- ──────────────────────────────────────────
INSERT INTO pipe_quotes (quote_no, vendor, project, delivery_location, address, contact_name, contact_phone, order_date, delivery_date, author, manufacturer, status, status_history, items, created_at) VALUES

('Q1-1', 'Horizon Construction Group', 'Sydney CBD Commercial Tower', 'Sydney NSW', '120 Collins St, Sydney NSW 2000', 'James Wilson', '02-9000-1001',
 '2026-01-05', '2026-01-15', 'Alex Kim', 'Philip Industries', '수주확정',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-01-05T09:00:00+09:00"},{"from_status":"검토중","to_status":"수주확정","changed_at":"2026-01-07T10:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":10,"unitPrice":85000,"manufacturer":"Philip Industries"},{"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":5,"unitPrice":98000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-01-05 09:00:00+09'),

('Q2-1', 'Metro Contractors Pty Ltd', 'Melbourne Southbank Apartments', 'Southbank VIC', '45 City Rd, Southbank VIC 3006', 'Michael Chen', '03-9000-1003',
 '2026-02-01', '2026-02-12', 'Sarah Lee', 'Philip Industries', '수주확정',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-02-01T09:00:00+09:00"},{"from_status":"검토중","to_status":"송부완료","changed_at":"2026-02-02T10:00:00+09:00"},{"from_status":"송부완료","to_status":"수주확정","changed_at":"2026-02-03T11:00:00+09:00"}]'::jsonb,
 '[{"name":"Steel Riser Integrated Clamp","internalName":"입상_강관_고정구_일체형","displayName":"Steel Riser Integrated Clamp","pipeSpec":"65A","sleeveSpec":"175A","spec":"65A*175A","unit":"pc","quantity":15,"unitPrice":145000,"manufacturer":"Philip Industries"},{"name":"PVC Wall Sleeve","internalName":"벽체_PVC","displayName":"PVC Wall Sleeve","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":20,"unitPrice":78000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-02-01 09:00:00+09'),

('Q4-1', 'Apex Infrastructure Group', 'Perth Waterfront Complex', 'Perth WA', '10 The Esplanade, Perth WA 6000', 'David Park', '08-9000-1006',
 '2026-04-02', '2026-04-20', 'Alex Kim', 'Philip Industries', '수주확정',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-04-02T09:00:00+09:00"},{"from_status":"검토중","to_status":"수주확정","changed_at":"2026-04-06T10:00:00+09:00"}]'::jsonb,
 '[{"name":"SUS Riser Frame","internalName":"입상_SU_고정틀","displayName":"SUS Riser Frame","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":12,"unitPrice":135000,"manufacturer":"Philip Industries"},{"name":"Sealant","internalName":"실란트","displayName":"Sealant 310ml","spec":"310ml","unit":"tube","quantity":10,"unitPrice":12000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-04-02 09:00:00+09'),

('Q5-1', 'Pacific Building Solutions', 'Brisbane Riverside Development', 'Brisbane QLD', '30 Eagle St, Brisbane QLD 4000', 'Sarah Thompson', '02-9000-1002',
 '2026-05-08', '2026-06-05', 'Sarah Lee', 'Philip Industries', '송부완료',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-05-08T09:00:00+09:00"},{"from_status":"검토중","to_status":"송부완료","changed_at":"2026-05-10T14:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":20,"unitPrice":120000,"manufacturer":"Philip Industries"},{"name":"Thermal Insulation","internalName":"차열재","displayName":"Thermal Insulation 50T×400","spec":"50T×400×3600","unit":"roll","quantity":8,"unitPrice":98000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-05-08 09:00:00+09'),

('Q6-1', 'Summit Engineering Co.', 'Adelaide Central Market Hub', 'Adelaide SA', '44 Gouger St, Adelaide SA 5000', 'Emily Davis', '07-9000-1004',
 '2026-06-05', '2026-06-30', 'Alex Kim', 'Philip Industries', '송부완료',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-06-05T09:00:00+09:00"},{"from_status":"검토중","to_status":"송부완료","changed_at":"2026-06-07T10:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Wall Sleeve","internalName":"벽체_PVC","displayName":"PVC Wall Sleeve","pipeSpec":"75A","sleeveSpec":"175A","spec":"75A*175A","unit":"pc","quantity":18,"unitPrice":95000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-06-05 09:00:00+09'),

('Q6-2', 'Metro Contractors Pty Ltd', 'Sydney Olympic Park Arena Expansion', 'Sydney Olympic Park NSW', '1 Olympic Blvd, Sydney Olympic Park NSW 2127', 'Michael Chen', '03-9000-1003',
 '2026-06-20', '2026-07-20', 'Sarah Lee', 'Philip Industries', '검토중',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-06-20T09:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"100A","sleeveSpec":"200A","spec":"100A*200A","unit":"pc","quantity":35,"unitPrice":120000,"manufacturer":"Philip Industries"},{"name":"Steel Riser Integrated Clamp","internalName":"입상_강관_고정구_일체형","displayName":"Steel Riser Integrated Clamp","pipeSpec":"65A","sleeveSpec":"175A","spec":"65A*175A","unit":"pc","quantity":20,"unitPrice":145000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-06-20 09:00:00+09'),

('Q6-3', 'Horizon Construction Group', 'Parramatta Civic Tower', 'Parramatta NSW', '2 Parramatta Square, Parramatta NSW 2150', 'James Wilson', '02-9000-1001',
 '2026-06-25', '2026-07-25', 'Alex Kim', 'P&I Corp', '검토중',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-06-25T09:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Riser Frame","internalName":"입상_PVC_고정틀","displayName":"PVC Riser Frame","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":20,"unitPrice":95000,"manufacturer":"P&I Corp"}]'::jsonb,
 '2026-06-25 09:00:00+09'),

('Q3-1', 'Pacific Building Solutions', 'Hobart Waterfront Hotel', 'Hobart TAS', '15 Salamanca Pl, Hobart TAS 7000', 'Sarah Thompson', '02-9000-1002',
 '2026-03-15', '2026-04-01', 'Sarah Lee', 'Philip Industries', '취소',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-03-15T09:00:00+09:00"},{"from_status":"검토중","to_status":"취소","changed_at":"2026-03-20T10:00:00+09:00"}]'::jsonb,
 '[{"name":"PVC Riser Integrated Clamp","internalName":"입상_PVC_고정구_일체형","displayName":"PVC Riser Integrated Clamp","pipeSpec":"50A","sleeveSpec":"150A","spec":"50A*150A","unit":"pc","quantity":8,"unitPrice":85000,"manufacturer":"Philip Industries"}]'::jsonb,
 '2026-03-15 09:00:00+09');


-- ──────────────────────────────────────────
-- 8. Duct quotes (덕트 견적서)
-- ──────────────────────────────────────────
INSERT INTO duct_quotes (quote_no, manufacturer, customer_name, project, delivery_location, address, contact_name, contact_phone, order_date, delivery_date, author, status, status_history, items, created_at) VALUES

('Q2-2', 'ProFire', 'Apex Infrastructure Group', 'Sydney CBD Commercial Tower', 'Sydney NSW', '120 Collins St, Sydney NSW 2000', 'David Park', '08-9000-1006',
 '2026-02-08', '2026-02-20', 'Alex Kim', '수주확정',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-02-08T09:00:00+09:00"},{"from_status":"검토중","to_status":"수주확정","changed_at":"2026-02-09T11:00:00+09:00"}]'::jsonb,
 '[{"type":"입상","manufacturer":"ProFire","width":400,"height":300,"quantity":8,"unit_price":217000,"amount":1736000,"note":""},{"type":"벽체","manufacturer":"ProFire","width":600,"height":400,"quantity":6,"unit_price":280000,"amount":1680000,"note":""}]'::jsonb,
 '2026-02-08 09:00:00+09'),

('Q4-2', 'Kings Asia Metal', 'Horizon Construction Group', 'Gold Coast High-Rise Tower', 'Gold Coast QLD', '1 Surfers Paradise Blvd, Gold Coast QLD 4217', 'James Wilson', '02-9000-1001',
 '2026-04-12', '2026-04-28', 'Sarah Lee', '수주확정',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-04-12T09:00:00+09:00"},{"from_status":"검토중","to_status":"송부완료","changed_at":"2026-04-13T10:00:00+09:00"},{"from_status":"송부완료","to_status":"수주확정","changed_at":"2026-04-14T11:00:00+09:00"}]'::jsonb,
 '[{"type":"입상","manufacturer":"Kings Asia Metal","width":500,"height":400,"quantity":10,"unit_price":245000,"amount":2450000,"note":""},{"type":"벽체","manufacturer":"Kings Asia Metal","width":800,"height":500,"quantity":5,"unit_price":310000,"amount":1550000,"note":""}]'::jsonb,
 '2026-04-12 09:00:00+09'),

('Q6-4', 'ProFire', 'Metro Contractors Pty Ltd', 'Melbourne Southbank Apartments', 'Southbank VIC', '45 City Rd, Southbank VIC 3006', 'Michael Chen', '03-9000-1003',
 '2026-06-15', '2026-07-10', 'Alex Kim', '송부완료',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-06-15T09:00:00+09:00"},{"from_status":"검토중","to_status":"송부완료","changed_at":"2026-06-17T10:00:00+09:00"}]'::jsonb,
 '[{"type":"입상","manufacturer":"ProFire","width":400,"height":400,"quantity":12,"unit_price":232000,"amount":2784000,"note":""},{"type":"벽체","manufacturer":"ProFire","width":700,"height":500,"quantity":7,"unit_price":295000,"amount":2065000,"note":""}]'::jsonb,
 '2026-06-15 09:00:00+09'),

('Q6-5', 'Kings Asia Metal', 'Pacific Building Solutions', 'Parramatta Civic Tower', 'Parramatta NSW', '2 Parramatta Square, Parramatta NSW 2150', 'Sarah Thompson', '02-9000-1002',
 '2026-06-28', '2026-07-25', 'Sarah Lee', '검토중',
 '[{"from_status":null,"to_status":"검토중","changed_at":"2026-06-28T09:00:00+09:00"}]'::jsonb,
 '[{"type":"입상","manufacturer":"Kings Asia Metal","width":600,"height":400,"quantity":15,"unit_price":268000,"amount":4020000,"note":""},{"type":"벽체","manufacturer":"Kings Asia Metal","width":900,"height":600,"quantity":6,"unit_price":330000,"amount":1980000,"note":""}]'::jsonb,
 '2026-06-28 09:00:00+09');


-- ──────────────────────────────────────────
-- 9. Sales leads (영업대상 현황)
-- ──────────────────────────────────────────
INSERT INTO sales_leads (seq, dealership, project_name, address, construction_company, facility_company, contact_name, contact_phone, scale, notes, status, status_history, last_update, created_at) VALUES
(1,  'Eastern Contractors',      'Sydney North Shore Office Park',        '1 Pacific Hwy, North Sydney NSW 2060',      'Lendlease',         'Pacific Mechanical',    'James Wilson',   '02-9000-1001', '25 floors',         'Existing partner — fast-track possible',                    '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-01-10T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-01-20T10:00:00+09:00"}]'::jsonb, '2026-06-10T09:00:00+09:00', '2026-01-10 09:00:00+09'),
(2,  'Pacific Plumbing & Fire',  'Melbourne CBD Mixed-Use Tower',         '200 Collins St, Melbourne VIC 3000',        'Multiplex',         'Central Plumbing Co.',  'Sarah Thompson', '02-9000-1002', '35 floors',         'Site manager contact secured',                              '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-01-15T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-02-01T11:00:00+09:00"}]'::jsonb, '2026-05-22T09:00:00+09:00', '2026-01-15 09:00:00+09'),
(3,  'Urban Build Group',        'Brisbane Newstead Apartments',          '20 Longland St, Newstead QLD 4006',         'Hutchinson Builders','Norths Plumbing',      'Michael Chen',   '03-9000-1003', '320 units',         'Fire-resistance specialist contractor introduced',          '착공전', '[{"from_status":null,"to_status":"등록","changed_at":"2026-02-05T09:00:00+09:00"},{"from_status":"등록","to_status":"착공전","changed_at":"2026-03-15T10:00:00+09:00"}]'::jsonb, '2026-04-05T09:00:00+09:00', '2026-02-05 09:00:00+09'),
(4,  'National Fire Protection', 'Perth Elizabeth Quay Hotel',            '1 Barrack St, Perth WA 6000',               'Roberts Co.',       'WA Fire Services',      'Emily Davis',    '07-9000-1004', '28 floors',         'Drawings review scheduled',                                 '등록',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-02-20T09:00:00+09:00"}]'::jsonb, NULL, '2026-02-20 09:00:00+09'),
(5,  'Allied Construction',      'Chatswood Interchange Development',     '1 Anderson St, Chatswood NSW 2067',         'John Holland',      'Metro Mechanical',      'Robert Kim',     '08-9000-1005', '800 units',         'Multiple suppliers competing — pricing critical',           '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-03-01T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-03-20T10:00:00+09:00"}]'::jsonb, '2026-06-15T09:00:00+09:00', '2026-03-01 09:00:00+09'),
(6,  'Premier Building',         'Gold Coast Broadbeach Towers',          '10 Broadbeach Blvd, Broadbeach QLD 4218',  'Grocon',            'QLD Fire & Plumbing',   'David Park',     '08-9000-1006', 'GFA 30,000㎡',      'Tender in preparation',                                     '이관',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-03-10T09:00:00+09:00"},{"from_status":"등록","to_status":"이관","changed_at":"2026-04-05T10:00:00+09:00"}]'::jsonb, '2026-04-05T09:00:00+09:00', '2026-03-10 09:00:00+09'),
(7,  'Eastern Contractors',      'Barangaroo South Commercial Precinct',  '1 Barangaroo Ave, Sydney NSW 2000',         'Lendlease',         'Sydney Mechanical',     'James Wilson',   '02-9000-1001', '42 floors',         'Referred via existing client — preferred supplier status',  '체결',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-03-15T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-03-25T10:00:00+09:00"},{"from_status":"진행중","to_status":"체결","changed_at":"2026-05-10T11:00:00+09:00"}]'::jsonb, '2026-05-10T09:00:00+09:00', '2026-03-15 09:00:00+09'),
(8,  'Pacific Plumbing & Fire',  'Adelaide Riverbank Precinct',           '5 Elder Park, Adelaide SA 5000',            'Built',             'SA Fire Solutions',     'Sarah Thompson', '02-9000-1002', '50 floors',         'Landmark project — aggressive pursuit',                     '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-04-01T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-04-15T10:00:00+09:00"}]'::jsonb, '2026-06-20T09:00:00+09:00', '2026-04-01 09:00:00+09'),
(9,  'Urban Build Group',        'Canberra City Renewal Authority Block', '10 Mort St, Canberra ACT 2601',             'Icon Co.',          'ACT Plumbing Services', 'Michael Chen',   '03-9000-1003', '220 units',         'Construction starts next year — early engagement done',     '착공전', '[{"from_status":null,"to_status":"등록","changed_at":"2026-04-10T09:00:00+09:00"},{"from_status":"등록","to_status":"착공전","changed_at":"2026-05-01T10:00:00+09:00"}]'::jsonb, '2026-05-01T09:00:00+09:00', '2026-04-10 09:00:00+09'),
(10, 'Allied Construction',      'Sunshine Coast University Hospital',    '6 University Way, Birtinya QLD 4575',       'Watpac',            'QLD Medical Fit-out',   'Robert Kim',     '08-9000-1005', 'GFA 45,000㎡',      'Healthcare — strict compliance requirements',               '등록',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-04-20T09:00:00+09:00"}]'::jsonb, NULL, '2026-04-20 09:00:00+09'),
(11, 'Premier Building',         'Parramatta Square Stage 5',             '3 Parramatta Square, Parramatta NSW 2150', 'Multiplex',         'Western Mechanical',    'David Park',     '08-9000-1006', 'GFA 80,000㎡',      'Duct + pipe package supply discussion underway',            '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-05-01T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-05-15T10:00:00+09:00"}]'::jsonb, '2026-06-25T09:00:00+09:00', '2026-05-01 09:00:00+09'),
(12, 'National Fire Protection', 'Darwin Waterfront Residential',         '1 Kitchener Dr, Darwin NT 0800',            'BGC Construction',  'NT Fire & Plumbing',    'Emily Davis',    '07-9000-1004', '1,200 units',       'New territory — initial contact stage',                     '등록',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-05-10T09:00:00+09:00"}]'::jsonb, NULL, '2026-05-10 09:00:00+09'),
(13, 'Eastern Contractors',      'Townsville CBD Revitalisation',         '100 Flinders St, Townsville QLD 4810',     'Hutchinson Builders','North QLD Services',   'James Wilson',   '02-9000-1001', '180 units',         'Entering via regional partner network',                     '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-05-20T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-06-01T10:00:00+09:00"}]'::jsonb, '2026-06-18T09:00:00+09:00', '2026-05-20 09:00:00+09'),
(14, 'Pacific Plumbing & Fire',  'Macquarie Park Innovation District',   '1 Talavera Rd, Macquarie Park NSW 2113',   'Lendlease',         'NSW Tech Fit-out',      'Sarah Thompson', '02-9000-1002', 'GFA 120,000㎡',     'Lost to competitor — follow up next tender',               '종료',   '[{"from_status":null,"to_status":"등록","changed_at":"2026-02-01T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-02-15T10:00:00+09:00"},{"from_status":"진행중","to_status":"종료","changed_at":"2026-04-30T11:00:00+09:00"}]'::jsonb, '2026-04-30T09:00:00+09:00', '2026-02-01 09:00:00+09'),
(15, 'Allied Construction',      'Western Sydney Airport Precinct',       'Mamre Rd, Aerotropolis NSW 2759',           'CPB Contractors',   'Airport Mechanical',    'Robert Kim',     '08-9000-1005', 'GFA 200,000㎡',     'Major infrastructure project — second-half push',           '진행중', '[{"from_status":null,"to_status":"등록","changed_at":"2026-06-01T09:00:00+09:00"},{"from_status":"등록","to_status":"진행중","changed_at":"2026-06-15T10:00:00+09:00"}]'::jsonb, '2026-06-25T09:00:00+09:00', '2026-06-01 09:00:00+09');


-- ──────────────────────────────────────────
-- 10. Shared memos (공유사항 메모)
-- ──────────────────────────────────────────
INSERT INTO order_memos (content, author, created_at) VALUES
  ('Philip Industries lead time update: orders placed after the 15th will be delivered in the first week of the following month. Expedite requests require prior coordination.', 'Alex Kim', '2026-06-28 09:00:00+09'),
  ('ProFire thermal insulation price increase expected in July. Recommend submitting quotes at current rates before the change.', 'Sarah Lee', '2026-06-30 14:00:00+09'),
  ('Gold Coast site access note: delivery vehicles must use the rear gate due to ongoing road works at the main entrance. Contact: James Wilson 02-9000-1001.', 'Alex Kim', '2026-07-01 10:00:00+09');
