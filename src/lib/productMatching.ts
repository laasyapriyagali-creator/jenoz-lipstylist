import { supabase, type Product } from './supabase';
import type { ShadeRecommendation } from './types';
import { colorDistance } from './faceAnalysis';

export async function fetchMatchingProducts(
  shade: ShadeRecommendation
): Promise<Product[]> {

  // Fetch all in-stock products
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('in_stock', true);

  if (error || !data) return [];

  const products = data as Product[];

  // Score each product by color distance to recommended shade
  const scored = products.map((p) => ({
    product: p,
    distance: colorDistance(p.color_hex, shade.hex),
  }));

  // Sort by closest color match
  scored.sort((a, b) => a.distance - b.distance);

  // Take top matches, but ensure variety: at least one lipstick, one gloss, one liner
  const result: Product[] = [];
  const seenTypes = new Set<string>();
  const maxPerType = 3;

  for (const { product } of scored) {
    if (result.length >= 8) break;

    const typeCount = result.filter((r) => r.type === product.type).length;
    if (typeCount >= maxPerType) continue;

    result.push(product);
    seenTypes.add(product.type);
  }

  // Ensure we have at least one of each type
  const types = ['lipstick', 'lip_gloss', 'lip_liner'];
  for (const type of types) {
    if (!result.some((r) => r.type === type)) {
      const bestOfType = scored.find((s) => s.product.type === type);
      if (bestOfType) result.push(bestOfType.product);
    }
  }

  return result;
}

export function getProductMatchScore(product: Product, shadeHex: string): number {
  const distance = colorDistance(product.color_hex, shadeHex);
  // Convert distance (0-441 max) to a 0-100 score
  const maxDistance = 200;
  return Math.max(0, Math.round(100 - (distance / maxDistance) * 100));
}

export function formatPrice(price: number | null): string {
  if (price === null) return 'Price unavailable';
  return `$${price.toFixed(2)}`;
}
