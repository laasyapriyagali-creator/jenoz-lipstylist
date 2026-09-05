import type { FaceLandmarks } from './faceAnalysis';
import { hexToRgb } from './faceAnalysis';

// ─── Types ──────────────────────────────────────────────────────────────

export type LipFinish = 'matte' | 'satin' | 'gloss' | 'tint' | 'liner';

export interface TryOnOptions {
  opacity: number;
  finish: LipFinish;
  featherRadius: number;
}

// ─── Catmull-Rom Spline ──────────────────────────────────────────────────
// Produces smooth curves through landmark points instead of jagged polygons.

function catmullRomSpline(
  points: { x: number; y: number }[],
  segments: number = 10,
  closed: boolean = true
): { x: number; y: number }[] {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const result: { x: number; y: number }[] = [];
  const n = points.length;

  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let t = 0; t < segments; t++) {
      const u = t / segments;
      const u2 = u * u;
      const u3 = u2 * u;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);

      result.push({ x, y });
    }
  }

  if (!closed) result.push(points[n - 1]);
  return result;
}

// ─── Path helpers ─────────────────────────────────────────────────────────

function traceSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  closed: boolean = true
): void {
  const smooth = catmullRomSpline(points, 10, closed);
  if (smooth.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(smooth[0].x, smooth[0].y);
  for (let i = 1; i < smooth.length; i++) {
    ctx.lineTo(smooth[i].x, smooth[i].y);
  }
  if (closed) ctx.closePath();
}

// ─── Bounding box ──────────────────────────────────────────────────────────

function getBoundingBox(points: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// ─── Pixel-level lip mask generation ──────────────────────────────────────
// 1. Draw the outer lip contour as a filled shape on an offscreen canvas.
// 2. Cut out the inner mouth (teeth/oral cavity) using evenodd fill.
// 3. Refine the mask using image color information — keep pixels that look like
//    lips (darker / more saturated than surrounding skin) and reject pixels that
//    look like teeth (bright, low saturation) or skin.

function generateLipMask(
  sourceCtx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks,
  width: number,
  height: number
): { maskCanvas: HTMLCanvasElement; maskData: Uint8ClampedArray } {
  // Offscreen mask canvas — 0 = no lip, 255 = full lip
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!;

  // Build the full outer lip contour: upper outer + lower outer (reversed)
  const outerContour = [
    ...landmarks.upperOuterLip,
    ...[...landmarks.lowerOuterLip].reverse().slice(1, -1),
  ];

  // Build the full inner mouth contour: upper inner + lower inner (reversed)
  const innerContour = [
    ...landmarks.upperInnerLip,
    ...[...landmarks.lowerInnerLip].reverse().slice(1, -1),
  ];

  // Step 1: Draw the lip mask with evenodd (outer minus inner = donut)
  maskCtx.fillStyle = 'white';
  maskCtx.beginPath();
  // Use smooth spline paths for natural curves
  const smoothOuter = catmullRomSpline(outerContour, 12, true);
  maskCtx.moveTo(smoothOuter[0].x, smoothOuter[0].y);
  for (let i = 1; i < smoothOuter.length; i++) {
    maskCtx.lineTo(smoothOuter[i].x, smoothOuter[i].y);
  }
  maskCtx.closePath();

  const smoothInner = catmullRomSpline(innerContour, 12, true);
  if (smoothInner.length > 2) {
    maskCtx.moveTo(smoothInner[0].x, smoothInner[0].y);
    for (let i = 1; i < smoothInner.length; i++) {
      maskCtx.lineTo(smoothInner[i].x, smoothInner[i].y);
    }
    maskCtx.closePath();
  }
  maskCtx.fill('evenodd');

  // Step 2: Read the mask and the source image, then refine using color info
  const maskData = maskCtx.getImageData(0, 0, width, height);
  const sourceData = sourceCtx.getImageData(0, 0, width, height);

  // Sample average skin color from cheek area (outside lip region)
  const skinPts = landmarks.allLandmarks
    .filter((_, i) => i === 234 || i === 454 || i === 93 || i === 323 || i === 50 || i === 280)
    .map((lm) => ({ x: lm.x * width, y: lm.y * height }));
  let skinR = 0, skinG = 0, skinB = 0, skinCount = 0;
  for (const pt of skinPts) {
    const px = Math.round(pt.x), py = Math.round(pt.y);
    if (px >= 0 && py >= 0 && px < width && py < height) {
      const idx = (py * width + px) * 4;
      skinR += sourceData.data[idx];
      skinG += sourceData.data[idx + 1];
      skinB += sourceData.data[idx + 2];
      skinCount++;
    }
  }
  if (skinCount > 0) { skinR /= skinCount; skinG /= skinCount; skinB /= skinCount; }

  // Get lip bounding box for localized processing
  const lipBox = getBoundingBox(landmarks.allLipPoints);
  const pad = 8;
  const x0 = Math.max(0, Math.floor(lipBox.minX - pad));
  const y0 = Math.max(0, Math.floor(lipBox.minY - pad));
  const x1 = Math.min(width, Math.ceil(lipBox.maxX + pad));
  const y1 = Math.min(height, Math.ceil(lipBox.maxY + pad));

  // Refine: for each pixel in the lip bounding box, check if it's actually lip
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      const maskVal = maskData.data[idx]; // red channel = mask value

      if (maskVal > 0) {
        const r = sourceData.data[idx];
        const g = sourceData.data[idx + 1];
        const b = sourceData.data[idx + 2];

        // Reject teeth: bright (luminance > 160) and low saturation
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

        if (lum > 160 && sat < 0.15) {
          // Likely teeth — reduce mask
          maskData.data[idx] = Math.round(maskVal * 0.15);
          maskData.data[idx + 1] = Math.round(maskVal * 0.15);
          maskData.data[idx + 2] = Math.round(maskVal * 0.15);
        }

        // Reject skin-like pixels at the border: if the pixel color is very close
        // to the surrounding skin color, reduce the mask (edge skin bleed)
        const skinDist = Math.sqrt(
          Math.pow(r - skinR, 2) + Math.pow(g - skinG, 2) + Math.pow(b - skinB, 2)
        );
        if (skinDist < 20 && lum > 100) {
          // Looks like skin, not lip — reduce
          const factor = skinDist / 20; // 0 at full skin match, 1 at threshold
          maskData.data[idx] = Math.round(maskVal * factor * 0.5);
          maskData.data[idx + 1] = Math.round(maskVal * factor * 0.5);
          maskData.data[idx + 2] = Math.round(maskVal * factor * 0.5);
        }
      }
    }
  }

  // Step 3: Feather the mask edges
  const feathered = featherMask(maskData.data, width, height, lipBox, 2);

  // Write back
  maskCtx.putImageData(new ImageData(feathered, width, height), 0, 0);

  return { maskCanvas, maskData: feathered };
}

// ─── Edge feathering ──────────────────────────────────────────────────────
// Applies a simple box blur to the mask alpha channel near edges for 1-3px
// feathering so the lipstick doesn't have a hard CGI border.

function featherMask(
  maskData: Uint8ClampedArray,
  width: number,
  height: number,
  lipBox: { minX: number; minY: number; maxX: number; maxY: number },
  radius: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(maskData.length);
  result.set(maskData);

  const pad = radius + 2;
  const x0 = Math.max(0, Math.floor(lipBox.minX - pad));
  const y0 = Math.max(0, Math.floor(lipBox.minY - pad));
  const x1 = Math.min(width, Math.ceil(lipBox.maxX + pad));
  const y1 = Math.min(height, Math.ceil(lipBox.maxY + pad));

  // Simple separable box blur on the alpha (red) channel
  const temp = new Float32Array((x1 - x0) * (y1 - y0));
  const w = x1 - x0;

  // Horizontal pass
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let sum = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = x + dx;
        if (sx >= x0 && sx < x1) {
          sum += maskData[(y * width + sx) * 4];
          count++;
        }
      }
      temp[(y - y0) * w + (x - x0)] = sum / count;
    }
  }

  // Vertical pass
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = y + dy;
        if (sy >= y0 && sy < y1) {
          sum += temp[(sy - y0) * w + (x - x0)];
          count++;
        }
      }
      const val = Math.round(sum / count);
      const idx = (y * width + x) * 4;
      result[idx] = val;
      result[idx + 1] = val;
      result[idx + 2] = val;
      result[idx + 3] = 255;
    }
  }

  return result;
}

// ─── Finish-specific rendering ─────────────────────────────────────────────
// Each finish type has different blending behavior:
// - Matte: strong pigment, reduced highlights, multiply blend
// - Satin: moderate pigment, preserve natural highlights, soft-light
// - Gloss: shade + preserved texture + added specular shine
// - Tint: low opacity, natural lip visible underneath
// - Liner: edge enhancement only, no fill

function applyFinishBlending(
  ctx: CanvasRenderingContext2D,
  maskData: Uint8ClampedArray,
  sourceData: ImageData,
  shadeHex: string,
  opacity: number,
  finish: LipFinish,
  width: number,
  height: number
): void {
  const { r: sr, g: sg, b: sb } = hexToRgb(shadeHex);

  // Get lip bounding box for localized processing
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < maskData.length; i += 4) {
    if (maskData[i] > 10) {
      const px = (i / 4) % width;
      const py = Math.floor((i / 4) / width);
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }
  if (minX === Infinity) return;

  const pad = 4;
  const x0 = Math.max(0, Math.floor(minX - pad));
  const y0 = Math.max(0, Math.floor(minY - pad));
  const x1 = Math.min(width, Math.ceil(maxX + pad));
  const y1 = Math.min(height, Math.ceil(maxY + pad));

  // Create output image data for the lip region
  const out = ctx.getImageData(0, 0, width, height);
  const outData = out.data;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      const maskVal = maskData[idx] / 255; // 0-1
      if (maskVal < 0.02) continue;

      const origR = sourceData.data[idx];
      const origG = sourceData.data[idx + 1];
      const origB = sourceData.data[idx + 2];

      // Original luminance and saturation
      const origLum = 0.299 * origR + 0.587 * origG + 0.114 * origB;
      const origMax = Math.max(origR, origG, origB);
      const origMin = Math.min(origR, origG, origB);
      const origSat = origMax === 0 ? 0 : (origMax - origMin) / origMax;

      let finalR: number, finalG: number, finalB: number;

      switch (finish) {
        case 'matte': {
          // Strong pigment with multiply, suppress highlights
          const blendStrength = opacity * maskVal;
          const mulR = (origR * sr) / 255;
          const mulG = (origG * sg) / 255;
          const mulB = (origB * sb) / 255;
          // Suppress original highlights (luminance > 180)
          const highlightSuppress = origLum > 180 ? 0.7 : 1.0;
          finalR = origR * (1 - blendStrength * highlightSuppress) + mulR * blendStrength * highlightSuppress;
          finalG = origG * (1 - blendStrength * highlightSuppress) + mulG * blendStrength * highlightSuppress;
          finalB = origB * (1 - blendStrength * highlightSuppress) + mulB * blendStrength * highlightSuppress;
          break;
        }

        case 'satin': {
          // Moderate pigment, preserve highlights via soft-light
          const blendStrength = opacity * 0.75 * maskVal;
          // Soft-light blend: if shade > 50%, darken; if < 50%, lighten
          const softR = origR + (sr - 128) * 2 * (origR / 255 - 0.5) * 255;
          const softG = origG + (sg - 128) * 2 * (origG / 255 - 0.5) * 255;
          const softB = origB + (sb - 128) * 2 * (origB / 255 - 0.5) * 255;
          // Mix multiply for color and soft-light for luminance preservation
          const mulR = (origR * sr) / 255;
          const mulG = (origG * sg) / 255;
          const mulB = (origB * sb) / 255;
          finalR = origR * (1 - blendStrength) + (mulR * 0.6 + softR * 0.4) * blendStrength;
          finalG = origG * (1 - blendStrength) + (mulG * 0.6 + softG * 0.4) * blendStrength;
          finalB = origB * (1 - blendStrength) + (mulB * 0.6 + softB * 0.4) * blendStrength;
          break;
        }

        case 'gloss': {
          // Shade + preserved texture + specular shine
          const blendStrength = opacity * 0.6 * maskVal;
          const mulR = (origR * sr) / 255;
          const mulG = (origG * sg) / 255;
          const mulB = (origB * sb) / 255;
          finalR = origR * (1 - blendStrength) + mulR * blendStrength;
          finalG = origG * (1 - blendStrength) + mulG * blendStrength;
          finalB = origB * (1 - blendStrength) + mulB * blendStrength;

          // Add specular highlight for gloss effect
          // Highlight where original is bright (natural reflections)
          if (origLum > 140 && origSat < 0.3) {
            const glossStrength = maskVal * 0.4;
            finalR = finalR * (1 - glossStrength) + 255 * glossStrength;
            finalG = finalG * (1 - glossStrength) + 255 * glossStrength;
            finalB = finalB * (1 - glossStrength) + 255 * glossStrength;
          }
          break;
        }

        case 'tint': {
          // Low opacity, natural lip color visible underneath
          const blendStrength = opacity * 0.35 * maskVal;
          const mulR = (origR * sr) / 255;
          const mulG = (origG * sg) / 255;
          const mulB = (origB * sb) / 255;
          finalR = origR * (1 - blendStrength) + mulR * blendStrength;
          finalG = origG * (1 - blendStrength) + mulG * blendStrength;
          finalB = origB * (1 - blendStrength) + mulB * blendStrength;
          break;
        }

        case 'liner': {
          // Edge enhancement only — darken edges, don't fill center
          // Check if this pixel is near the mask edge (mask value between 30-200)
          const isEdge = maskVal > 0.15 && maskVal < 0.85;
          if (isEdge) {
            const blendStrength = opacity * 0.8 * maskVal;
            const mulR = (origR * sr) / 255;
            const mulG = (origG * sg) / 255;
            const mulB = (origB * sb) / 255;
            finalR = origR * (1 - blendStrength) + mulR * blendStrength;
            finalG = origG * (1 - blendStrength) + mulG * blendStrength;
            finalB = origB * (1 - blendStrength) + mulB * blendStrength;
          } else {
            finalR = origR;
            finalG = origG;
            finalB = origB;
          }
          break;
        }

        default: {
          finalR = origR;
          finalG = origG;
          finalB = origB;
        }
      }

      // Apply with mask alpha
      const alpha = maskVal;
      outData[idx] = Math.round(origR * (1 - alpha) + finalR * alpha);
      outData[idx + 1] = Math.round(origG * (1 - alpha) + finalG * alpha);
      outData[idx + 2] = Math.round(origB * (1 - alpha) + finalB * alpha);
      // Keep original alpha
    }
  }

  ctx.putImageData(out, 0, 0);
}

// ─── Main entry point ──────────────────────────────────────────────────────

export function applyLipColor(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks,
  shadeHex: string,
  options: TryOnOptions = {
    opacity: 0.65,
    finish: 'satin',
    featherRadius: 2,
  }
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Save the original image data before any modifications
  const sourceData = ctx.getImageData(0, 0, width, height);

  // Generate the pixel-level lip mask
  const { maskData } = generateLipMask(ctx, landmarks, width, height);

  // Apply finish-specific blending
  applyFinishBlending(
    ctx,
    maskData,
    sourceData,
    shadeHex,
    options.opacity,
    options.finish,
    width,
    height
  );
}

// ─── Convenience: create a full try-on canvas ──────────────────────────────

export function createTryOnCanvas(
  sourceImage: HTMLImageElement,
  landmarks: FaceLandmarks,
  shadeHex: string,
  finish: LipFinish = 'satin',
  intensity: number = 0.65
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth;
  canvas.height = sourceImage.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(sourceImage, 0, 0);
  applyLipColor(ctx, landmarks, shadeHex, {
    opacity: intensity,
    finish,
    featherRadius: 2,
  });

  return canvas;
}

// ─── Debug: draw the lip mask outline ─────────────────────────────────────

export function drawLipOutline(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks,
  color: string = 'rgba(255, 255, 255, 0.3)'
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const outer = [...landmarks.upperOuterLip, ...[...landmarks.lowerOuterLip].reverse().slice(1, -1)];
  traceSmoothPath(ctx, outer, true);
  ctx.stroke();

  const inner = [...landmarks.upperInnerLip, ...[...landmarks.lowerInnerLip].reverse().slice(1, -1)];
  traceSmoothPath(ctx, inner, true);
  ctx.stroke();

  ctx.restore();
}
