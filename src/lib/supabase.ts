import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: string;
  brand: string;
  name: string;
  shade: string;
  type: string;
  color_hex: string;
  color_family: string;
  finish: string;
  undertone: string;
  price: number | null;
  currency: string;
  store: string;
  url: string;
  image_url: string | null;
  in_stock: boolean;
  description: string | null;
}

export interface ScanRecord {
  id: string;
  image_data: string | null;
  skin_tone: string | null;
  skin_undertone: string | null;
  lip_color_hex: string | null;
  face_detected: boolean;
  vibe: string | null;
  recommended_shade_name: string | null;
  recommended_shade_hex: string | null;
  recommended_shade_description: string | null;
  created_at: string;
}
