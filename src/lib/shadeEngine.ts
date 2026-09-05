import type { FaceAnalysis, ShadeRecommendation, Vibe } from './types';
import { hexToRgb, rgbToHex } from './faceAnalysis';

interface ShadeParams {
  hue: number;
  saturation: number;
  lightness: number;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function rgbToHexStr(r: number, g: number, b: number): string {
  return rgbToHex(r, g, b);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function blendColors(hex1: string, hex2: string, ratio: number): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return rgbToHexStr(
    a.r * (1 - ratio) + b.r * ratio,
    a.g * (1 - ratio) + b.g * ratio,
    a.b * (1 - ratio) + b.b * ratio
  );
}

const VIBE_SHADE_PROFILES: Record<string, ShadeParams[]> = {
  casual: [
    { hue: 20, saturation: 0.35, lightness: 0.62 },
    { hue: 15, saturation: 0.3, lightness: 0.58 },
  ],
  'date-night': [
    { hue: 350, saturation: 0.5, lightness: 0.5 },
    { hue: 355, saturation: 0.45, lightness: 0.48 },
  ],
  party: [
    { hue: 345, saturation: 0.75, lightness: 0.45 },
    { hue: 350, saturation: 0.7, lightness: 0.5 },
  ],
  traditional: [
    { hue: 5, saturation: 0.7, lightness: 0.38 },
    { hue: 10, saturation: 0.65, lightness: 0.4 },
  ],
  festive: [
    { hue: 15, saturation: 0.65, lightness: 0.5 },
    { hue: 20, saturation: 0.6, lightness: 0.52 },
  ],
  bold: [
    { hue: 340, saturation: 0.7, lightness: 0.35 },
    { hue: 350, saturation: 0.65, lightness: 0.3 },
  ],
  'clean-girl': [
    { hue: 25, saturation: 0.25, lightness: 0.68 },
    { hue: 20, saturation: 0.2, lightness: 0.72 },
  ],
  glam: [
    { hue: 0, saturation: 0.8, lightness: 0.42 },
    { hue: 355, saturation: 0.75, lightness: 0.45 },
  ],
  '90s-brown': [
    { hue: 25, saturation: 0.45, lightness: 0.45 },
    { hue: 20, saturation: 0.4, lightness: 0.42 },
  ],
  'soft-romantic': [
    { hue: 340, saturation: 0.35, lightness: 0.6 },
    { hue: 345, saturation: 0.3, lightness: 0.63 },
  ],
  'y2k-gloss': [
    { hue: 15, saturation: 0.3, lightness: 0.55 },
    { hue: 20, saturation: 0.25, lightness: 0.6 },
  ],
  'dark-academia': [
    { hue: 350, saturation: 0.55, lightness: 0.3 },
    { hue: 345, saturation: 0.5, lightness: 0.28 },
  ],
};

const SHADE_NAMES = [
  'Velvet Whisper', 'Honeyed Rose', 'Sunset Bloom', 'Mocha Dream',
  'Crimson Echo', 'Petal Soft', 'Amber Glow', 'Rosy Twilight',
  'Berry Kiss', 'Nude Illusion', 'Coral Haze', 'Plum Velvet',
  'Toasted Rose', 'Dusty Mauve', 'Brick Rose', 'Spiced Honey',
  'Blushing Sand', 'Wine Noir', 'Peach Whisper', 'Mahogany Sheen',
  'Rosewood Muse', 'Caramel Blush', 'Mulberry Stain', 'Terracotta Muse',
  'Silk Petal', 'Ember Rose', 'Bare Beauty', 'Smoked Rose',
];

function generateShadeName(hue: number, saturation: number, lightness: number): string {
  const idx = Math.floor((hue + saturation * 100 + lightness * 100) % SHADE_NAMES.length);
  return SHADE_NAMES[idx];
}

function getColorFamily(hue: number, saturation: number, lightness: number): string {
  if (saturation < 0.15) return 'nude';
  if (hue >= 340 || hue < 15) return 'red';
  if (hue >= 15 && hue < 35) return 'coral';
  if (hue >= 35 && hue < 60) return 'brown';
  if (hue >= 300 && hue < 340) return 'berry';
  if (hue >= 270 && hue < 300) return 'berry';
  if (hue >= 320 && hue < 345) return 'pink';
  if (hue >= 345 && hue < 360) return 'red';
  if (lightness < 0.35) return 'berry';
  return 'mauve';
}

function getFinish(vibeId: string): string {
  if (vibeId === 'y2k-gloss' || vibeId === 'clean-girl') return 'glossy';
  if (vibeId === 'casual' || vibeId === 'soft-romantic') return 'satin';
  return 'matte';
}

function generateDescription(
  hue: number,
  saturation: number,
  lightness: number,
  undertone: string,
  vibe: Vibe
): string {
  const family = getColorFamily(hue, saturation, lightness);
  const intensity = saturation > 0.6 ? 'bold' : saturation > 0.35 ? 'medium' : 'soft';
  const depth = lightness > 0.6 ? 'light' : lightness > 0.4 ? 'medium' : 'deep';

  const familyNames: Record<string, string> = {
    nude: 'nude',
    red: 'red',
    coral: 'coral',
    brown: 'brown',
    berry: 'berry',
    pink: 'pink',
    mauve: 'mauve',
  };

  const familyName = familyNames[family] ?? family;

  return `A ${depth} ${intensity} ${familyName} with ${undertone} undertones, crafted for a ${vibe.label.toLowerCase()} look. This shade complements your ${undertone} skin undertone while delivering the perfect ${getFinish(vibe.id)} finish for your chosen vibe.`;
}

function generateWhyItSuits(
  analysis: FaceAnalysis,
  hue: number,
  saturation: number,
  lightness: number,
  vibe: Vibe
): string {
  const reasons: string[] = [];

  // Undertone match
  if (analysis.skinUndertone === 'warm' && (hue >= 10 && hue <= 45)) {
    reasons.push(`The warm ${getColorFamily(hue, saturation, lightness)} base harmonizes with your warm undertone`);
  } else if (analysis.skinUndertone === 'cool' && (hue >= 330 || hue <= 15)) {
    reasons.push(`The cool-toned ${getColorFamily(hue, saturation, lightness)} complements your cool undertone`);
  } else {
    reasons.push(`The balanced ${getColorFamily(hue, saturation, lightness)} works beautifully with your neutral undertone`);
  }

  // Skin tone contrast
  if (analysis.skinLuminance > 0.6 && lightness < 0.5) {
    reasons.push(`The deeper shade creates a striking contrast against your ${analysis.skinTone} complexion`);
  } else if (analysis.skinLuminance < 0.4 && lightness > 0.5) {
    reasons.push(`The lighter shade adds a luminous lift to your ${analysis.skinTone} skin`);
  } else {
    reasons.push(`The shade depth is perfectly balanced for your ${analysis.skinTone} skin tone`);
  }

  // Vibe match
  reasons.push(`The ${vibe.description.toLowerCase()} aesthetic is captured through the ${getFinish(vibe.id)} finish and ${getColorFamily(hue, saturation, lightness)} hue`);

  return reasons.join('. ') + '.';
}

function adjustForSkinTone(
  params: ShadeParams,
  analysis: FaceAnalysis
): ShadeParams {
  let adjustedHue = params.hue;
  let adjustedSaturation = params.saturation;
  let adjustedLightness = params.lightness;

  // Adjust hue based on undertone
  if (analysis.skinUndertone === 'warm') {
    // Push slightly warmer
    adjustedHue = clamp(adjustedHue + 5, 0, 360);
  } else if (analysis.skinUndertone === 'cool') {
    // Push slightly cooler
    adjustedHue = clamp(adjustedHue - 5, 0, 360);
  }

  // Adjust lightness based on skin luminance
  // Deeper skin tones can carry both lighter and deeper shades
  // Lighter skin tones need more contrast
  if (analysis.skinLuminance > 0.7) {
    // Fair skin - slightly deeper shade for contrast
    adjustedLightness = clamp(adjustedLightness - 0.05, 0.2, 0.8);
  } else if (analysis.skinLuminance < 0.3) {
    // Deep skin - slightly brighter/lighter for pop
    adjustedLightness = clamp(adjustedLightness + 0.05, 0.2, 0.8);
  }

  // Adjust saturation based on lip natural saturation
  // If lips are naturally pigmented, go slightly more saturated
  if (analysis.lipSaturation > 0.3) {
    adjustedSaturation = clamp(adjustedSaturation + 0.05, 0, 1);
  }

  return {
    hue: adjustedHue,
    saturation: adjustedSaturation,
    lightness: adjustedLightness,
  };
}

export function generateShadeRecommendation(
  analysis: FaceAnalysis,
  vibe: Vibe,
  customVibeText?: string
): ShadeRecommendation {
  // Get base shade profile from vibe
  const profiles = VIBE_SHADE_PROFILES[vibe.id] ?? VIBE_SHADE_PROFILES['casual'];

  // If custom vibe text provided, blend with vibe keywords
  let selectedProfile = profiles[0];

  // Parse custom text for additional adjustments
  if (customVibeText) {
    const lowerText = customVibeText.toLowerCase();
    if (lowerText.includes('dark') || lowerText.includes('deep')) {
      selectedProfile = { ...selectedProfile, lightness: clamp(selectedProfile.lightness - 0.15, 0.2, 0.8) };
    }
    if (lowerText.includes('light') || lowerText.includes('soft') || lowerText.includes('sheer')) {
      selectedProfile = { ...selectedProfile, lightness: clamp(selectedProfile.lightness + 0.1, 0.2, 0.8), saturation: clamp(selectedProfile.saturation - 0.1, 0, 1) };
    }
    if (lowerText.includes('bold') || lowerText.includes('vivid') || lowerText.includes('bright')) {
      selectedProfile = { ...selectedProfile, saturation: clamp(selectedProfile.saturation + 0.15, 0, 1) };
    }
    if (lowerText.includes('brown') || lowerText.includes('90s') || lowerText.includes('chocolate')) {
      selectedProfile = { ...selectedProfile, hue: 25, saturation: clamp(selectedProfile.saturation * 0.8, 0.1, 0.6) };
    }
    if (lowerText.includes('red') && !lowerText.includes('reddish')) {
      selectedProfile = { ...selectedProfile, hue: 0, saturation: clamp(selectedProfile.saturation + 0.2, 0.3, 0.9) };
    }
    if (lowerText.includes('pink')) {
      selectedProfile = { ...selectedProfile, hue: 340, saturation: clamp(selectedProfile.saturation * 0.7, 0.15, 0.6) };
    }
    if (lowerText.includes('gloss') || lowerText.includes('glossy')) {
      selectedProfile = { ...selectedProfile, saturation: clamp(selectedProfile.saturation * 0.7, 0.1, 0.5) };
    }
    if (lowerText.includes('nude') || lowerText.includes('natural')) {
      selectedProfile = { ...selectedProfile, saturation: clamp(selectedProfile.saturation * 0.5, 0.1, 0.4), lightness: clamp(selectedProfile.lightness + 0.05, 0.3, 0.75) };
    }
    if (lowerText.includes('berry') || lowerText.includes('plum') || lowerText.includes('wine')) {
      selectedProfile = { ...selectedProfile, hue: 350, saturation: clamp(selectedProfile.saturation + 0.1, 0.3, 0.7), lightness: clamp(selectedProfile.lightness - 0.1, 0.2, 0.6) };
    }
    if (lowerText.includes('coral') || lowerText.includes('peach')) {
      selectedProfile = { ...selectedProfile, hue: 15, saturation: clamp(selectedProfile.saturation * 0.8, 0.2, 0.6) };
    }
    if (lowerText.includes('fuller') || lowerText.includes('plump')) {
      selectedProfile = { ...selectedProfile, saturation: clamp(selectedProfile.saturation * 0.6, 0.1, 0.4), lightness: clamp(selectedProfile.lightness + 0.08, 0.4, 0.75) };
    }
  }

  // Adjust for individual's face analysis
  const adjusted = adjustForSkinTone(selectedProfile, analysis);

  // Convert to RGB then hex
  const rgb = hslToRgb(adjusted.hue, adjusted.saturation, adjusted.lightness);
  const hex = rgbToHexStr(rgb.r, rgb.g, rgb.b);

  // Blend slightly with natural lip color for realism
  const blendedHex = blendColors(hex, analysis.lipColorHex, 0.15);

  // Generate shade name
  const name = generateShadeName(adjusted.hue, adjusted.saturation, adjusted.lightness);

  // Generate description
  const description = generateDescription(
    adjusted.hue,
    adjusted.saturation,
    adjusted.lightness,
    analysis.skinUndertone,
    vibe
  );

  // Generate why it suits
  const whyItSuits = generateWhyItSuits(
    analysis,
    adjusted.hue,
    adjusted.saturation,
    adjusted.lightness,
    vibe
  );

  // Confidence based on face detection score and analysis quality
  const confidence = Math.round(analysis.confidence * 100);

  return {
    name,
    hex: blendedHex,
    description,
    undertone: analysis.skinUndertone,
    finish: getFinish(vibe.id),
    whyItSuits,
    confidence,
    colorFamily: getColorFamily(adjusted.hue, adjusted.saturation, adjusted.lightness),
  };
}

export function generateAlternativeShades(
  analysis: FaceAnalysis,
  vibe: Vibe,
  primary: ShadeRecommendation,
  customVibeText?: string
): ShadeRecommendation[] {
  const profiles = VIBE_SHADE_PROFILES[vibe.id] ?? VIBE_SHADE_PROFILES['casual'];
  const alternatives: ShadeRecommendation[] = [];

  // Generate 2 alternative shades with different profiles
  for (let i = 1; i < Math.min(3, profiles.length); i++) {
    let profile = profiles[i];
    if (customVibeText) {
      // Apply same custom adjustments
      const lowerText = customVibeText.toLowerCase();
      if (lowerText.includes('dark') || lowerText.includes('deep')) {
        profile = { ...profile, lightness: clamp(profile.lightness - 0.15, 0.2, 0.8) };
      }
      if (lowerText.includes('bold') || lowerText.includes('vivid') || lowerText.includes('bright')) {
        profile = { ...profile, saturation: clamp(profile.saturation + 0.15, 0, 1) };
      }
    }

    const adjusted = adjustForSkinTone(profile, analysis);
    const rgb = hslToRgb(adjusted.hue, adjusted.saturation, adjusted.lightness);
    const hex = rgbToHexStr(rgb.r, rgb.g, rgb.b);
    const blendedHex = blendColors(hex, analysis.lipColorHex, 0.15);
    const name = generateShadeName(adjusted.hue + 30, adjusted.saturation, adjusted.lightness);
    const description = generateDescription(adjusted.hue, adjusted.saturation, adjusted.lightness, analysis.skinUndertone, vibe);
    const whyItSuits = generateWhyItSuits(analysis, adjusted.hue, adjusted.saturation, adjusted.lightness, vibe);

    alternatives.push({
      name,
      hex: blendedHex,
      description,
      undertone: analysis.skinUndertone,
      finish: getFinish(vibe.id),
      whyItSuits,
      confidence: Math.round(analysis.confidence * 90),
      colorFamily: getColorFamily(adjusted.hue, adjusted.saturation, adjusted.lightness),
    });
  }

  // If only one profile exists, create a variation
  if (alternatives.length === 0) {
    const variation: ShadeParams = {
      hue: clamp(primary.colorFamily === 'red' ? 350 : 20, 0, 360),
      saturation: clamp(profiles[0].saturation * 0.7, 0.1, 0.8),
      lightness: clamp(profiles[0].lightness + 0.08, 0.25, 0.75),
    };
    const adjusted = adjustForSkinTone(variation, analysis);
    const rgb = hslToRgb(adjusted.hue, adjusted.saturation, adjusted.lightness);
    const hex = rgbToHexStr(rgb.r, rgb.g, rgb.b);
    const blendedHex = blendColors(hex, analysis.lipColorHex, 0.15);
    const name = generateShadeName(adjusted.hue + 60, adjusted.saturation, adjusted.lightness);
    const description = generateDescription(adjusted.hue, adjusted.saturation, adjusted.lightness, analysis.skinUndertone, vibe);
    const whyItSuits = generateWhyItSuits(analysis, adjusted.hue, adjusted.saturation, adjusted.lightness, vibe);

    alternatives.push({
      name,
      hex: blendedHex,
      description,
      undertone: analysis.skinUndertone,
      finish: getFinish(vibe.id),
      whyItSuits,
      confidence: Math.round(analysis.confidence * 85),
      colorFamily: getColorFamily(adjusted.hue, adjusted.saturation, adjusted.lightness),
    });
  }

  return alternatives;
}
