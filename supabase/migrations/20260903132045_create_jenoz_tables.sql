/*
# Create Jenoz AI tables (single-tenant, no auth)

1. New Tables
- `products`: Real lip product catalog with verified purchase URLs, prices, brands, shades.
  - id (uuid, PK)
  - brand (text) - e.g. "MAC Cosmetics", "NYX Professional Makeup"
  - name (text) - product name
  - shade (text) - shade name
  - type (text) - "lipstick", "lip_gloss", "lip_liner", "lip_stain", "lip_tint"
  - color_hex (text) - hex color representation of the shade
  - color_family (text) - "nude", "pink", "red", "berry", "brown", "coral", "mauve"
  - finish (text) - "matte", "satin", "glossy", "sheer", "metallic"
  - undertone (text) - "warm", "cool", "neutral"
  - price (numeric) - price in USD
  - currency (text, default 'USD')
  - store (text) - retailer name
  - url (text) - direct purchase URL
  - image_url (text) - product image URL
  - in_stock (boolean, default true)
  - description (text)
  - created_at (timestamptz)

- `scans`: Records of user face analysis sessions.
  - id (uuid, PK)
  - image_data (text) - base64 thumbnail for display
  - skin_tone (text) - detected skin tone label
  - skin_undertone (text) - warm/cool/neutral
  - lip_color_hex (text) - detected natural lip color
  - face_detected (boolean)
  - vibe (text) - selected occasion/vibe
  - recommended_shade_name (text)
  - recommended_shade_hex (text)
  - recommended_shade_description (text)
  - created_at (timestamptz)

2. Security
- Enable RLS on both tables.
- products: public read (catalog is shared), no writes from frontend.
- scans: anon+authenticated CRUD (single-tenant, no auth).
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  name text NOT NULL,
  shade text NOT NULL,
  type text NOT NULL,
  color_hex text NOT NULL,
  color_family text NOT NULL,
  finish text NOT NULL DEFAULT 'matte',
  undertone text NOT NULL DEFAULT 'neutral',
  price numeric(10,2),
  currency text NOT NULL DEFAULT 'USD',
  store text NOT NULL,
  url text NOT NULL,
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_data text,
  skin_tone text,
  skin_undertone text,
  lip_color_hex text,
  face_detected boolean NOT NULL DEFAULT false,
  vibe text,
  recommended_shade_name text,
  recommended_shade_hex text,
  recommended_shade_description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scans" ON scans;
CREATE POLICY "anon_select_scans" ON scans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
CREATE POLICY "anon_insert_scans" ON scans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scans;
CREATE POLICY "anon_update_scans" ON scans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans FOR DELETE
  TO anon, authenticated USING (true);

-- Index for product matching queries
CREATE INDEX IF NOT EXISTS idx_products_color_family ON products(color_family);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
