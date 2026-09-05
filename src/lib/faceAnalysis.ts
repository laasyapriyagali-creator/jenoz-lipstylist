import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<void> | null = null;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export async function loadFaceModels(): Promise<void> {
  if (landmarker) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      numFaces: 1,
    });
  })();

  return loadingPromise;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.substring(0, 2), 16),
    g: parseInt(m.substring(2, 4), 16),
    b: parseInt(m.substring(4, 6), 16),
  };
}

export function colorDistance(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)
  );
}

// MediaPipe Face Mesh lip landmark indices
// Upper outer lip (left to right): 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291
// Lower outer lip (right to left): 291, 375, 321, 405, 314, 17, 84, 181, 146, 61
// Upper inner lip: 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308
// Lower inner lip: 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78

const UPPER_OUTER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const LOWER_OUTER_LIP = [291, 375, 321, 405, 314, 17, 84, 181, 146, 61];
const UPPER_INNER_LIP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LOWER_INNER_LIP = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

// Additional lip detail points for higher density mask
const LIP_DETAIL_POINTS = [
  76, 77, 79, 83, 84, 85, 86, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100, 101,
  102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131,
  132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 147,
  148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162,
  163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177,
  179, 180, 181, 182, 183, 184, 186, 187, 188, 189, 190, 191, 192, 193, 194,
  195, 196, 197, 198, 199, 200,
];

// All lip-related indices for comprehensive coverage
const ALL_LIP_INDICES = new Set([
  ...UPPER_OUTER_LIP,
  ...LOWER_OUTER_LIP,
  ...UPPER_INNER_LIP,
  ...LOWER_INNER_LIP,
  ...LIP_DETAIL_POINTS,
]);

// Face oval / cheek indices for skin sampling
const SKIN_SAMPLE_INDICES = [
  234, 93, 132, 58, 172, 136, 150, 149, 176, 148,
  454, 323, 361, 288, 397, 378, 379, 365, 397, 288,
  50, 205, 425, 411, 376, 433, 416,
];

export interface LipContour {
  points: { x: number; y: number }[];
}

export interface FaceLandmarks {
  // Dense lip contours — all in pixel coordinates of the source image
  upperOuterLip: { x: number; y: number }[];
  lowerOuterLip: { x: number; y: number }[];
  upperInnerLip: { x: number; y: number }[];
  lowerInnerLip: { x: number; y: number }[];
  // All lip landmark points for mask generation
  allLipPoints: { x: number; y: number }[];
  // Face bounding box
  faceBox: { x: number; y: number; width: number; height: number };
  // Confidence metrics
  confidence: number;
  lipConfidence: number;
  // All 478 landmarks (normalized 0-1)
  allLandmarks: { x: number; y: number; z: number }[];
  // Image dimensions
  imageWidth: number;
  imageHeight: number;
}

export async function detectFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceLandmarks | null> {
  if (!landmarker) {
    await loadFaceModels();
    if (!landmarker) return null;
  }

  // Determine image dimensions
  let imgWidth: number;
  let imgHeight: number;
  if (input instanceof HTMLImageElement) {
    imgWidth = input.naturalWidth;
    imgHeight = input.naturalHeight;
  } else if (input instanceof HTMLVideoElement) {
    imgWidth = input.videoWidth;
    imgHeight = input.videoHeight;
  } else {
    imgWidth = input.width;
    imgHeight = input.height;
  }

  if (imgWidth === 0 || imgHeight === 0) return null;

  // Switch to IMAGE mode for still images, VIDEO for video streams
  const isVideo = input instanceof HTMLVideoElement;
  if (isVideo) {
    landmarker.setOptions({ runningMode: 'VIDEO', numFaces: 1 });
  }

  const result = isVideo
    ? landmarker.detectForVideo(input, performance.now())
    : landmarker.detect(input);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

  const landmarks = result.faceLandmarks[0]; // array of 478 normalized {x, y, z}

  // Convert normalized coords to pixel coords
  const toPx = (lm: { x: number; y: number; z: number }) => ({
    x: lm.x * imgWidth,
    y: lm.y * imgHeight,
  });

  const upperOuter = UPPER_OUTER_LIP.map((i) => toPx(landmarks[i]));
  const lowerOuter = LOWER_OUTER_LIP.map((i) => toPx(landmarks[i]));
  const upperInner = UPPER_INNER_LIP.map((i) => toPx(landmarks[i]));
  const lowerInner = LOWER_INNER_LIP.map((i) => toPx(landmarks[i]));

  // Collect all lip points
  const allLipPoints = Array.from(ALL_LIP_INDICES).map((i) => toPx(landmarks[i]));

  // Compute face bounding box from all landmarks
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lm of landmarks) {
    const x = lm.x * imgWidth;
    const y = lm.y * imgHeight;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  // Compute lip confidence based on landmark stability
  // Check if lip landmarks are reasonable (not collapsed to a point, within face bounds)
  const lipCenter = {
    x: (upperOuter[0].x + upperOuter[upperOuter.length - 1].x) / 2,
    y: (upperOuter[0].y + lowerOuter[5].y) / 2,
  };

  const lipWidth = Math.abs(upperOuter[0].x - upperOuter[upperOuter.length - 1].x);
  const lipHeight = Math.abs(upperOuter[5].y - lowerOuter[5].y);
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;

  // Lip should be roughly 15-50% of face width
  const lipWidthRatio = lipWidth / faceWidth;
  // Lips should not be collapsed
  const lipHeightRatio = lipHeight / faceHeight;

  let lipConfidence = 1.0;
  if (lipWidthRatio < 0.10 || lipWidthRatio > 0.60) lipConfidence *= 0.5;
  if (lipHeightRatio < 0.01) lipConfidence *= 0.3;
  if (lipHeightRatio > 0.25) lipConfidence *= 0.7;

  // Check if lip center is in the lower third of the face
  const lipVerticalPosition = (lipCenter.y - minY) / faceHeight;
  if (lipVerticalPosition < 0.45 || lipVerticalPosition > 0.85) lipConfidence *= 0.5;

  // Check landmarks are within image bounds
  for (const p of [...upperOuter, ...lowerOuter]) {
    if (p.x < 0 || p.x > imgWidth || p.y < 0 || p.y > imgHeight) {
      lipConfidence *= 0.3;
      break;
    }
  }

  // Overall face detection confidence
  const faceConfidence = result.faceLandmarks.length > 0 ? 0.95 : 0;

  return {
    upperOuterLip: upperOuter,
    lowerOuterLip: lowerOuter,
    upperInnerLip: upperInner,
    lowerInnerLip: lowerInner,
    allLipPoints,
    faceBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    confidence: faceConfidence,
    lipConfidence,
    allLandmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
    imageWidth: imgWidth,
    imageHeight: imgHeight,
  };
}

export function getAverageColor(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  padding: number = 2
): { r: number; g: number; b: number } {
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (const point of points) {
    const px = Math.round(point.x);
    const py = Math.round(point.y);
    for (let dx = -padding; dx <= padding; dx++) {
      for (let dy = -padding; dy <= padding; dy++) {
        const x = px + dx;
        const y = py + dy;
        if (x >= 0 && y >= 0 && x < ctx.canvas.width && y < ctx.canvas.height) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          totalR += pixel[0];
          totalG += pixel[1];
          totalB += pixel[2];
          count++;
        }
      }
    }
  }

  return {
    r: count > 0 ? totalR / count : 0,
    g: count > 0 ? totalG / count : 0,
    b: count > 0 ? totalB / count : 0,
  };
}

export function getSkinColor(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks
): { r: number; g: number; b: number } {
  const pts = SKIN_SAMPLE_INDICES.map((i) => ({
    x: landmarks.allLandmarks[i].x * landmarks.imageWidth,
    y: landmarks.allLandmarks[i].y * landmarks.imageHeight,
  }));
  return getAverageColor(ctx, pts, 5);
}

export function determineUndertone(
  skinColor: { r: number; g: number; b: number }
): 'warm' | 'cool' | 'neutral' {
  const { r, g, b } = skinColor;
  const warmth = (r + g) / 2 - b;
  const coolness = b - g * 0.7;
  if (warmth > 25 && g > b) return 'warm';
  if (coolness > 5 || b > g * 0.85) return 'cool';
  return 'neutral';
}

export function determineSkinTone(
  skinColor: { r: number; g: number; b: number }
): string {
  const luminance = (0.299 * skinColor.r + 0.587 * skinColor.g + 0.114 * skinColor.b) / 255;
  if (luminance > 0.75) return 'fair';
  if (luminance > 0.6) return 'light';
  if (luminance > 0.45) return 'medium';
  if (luminance > 0.3) return 'tan';
  if (luminance > 0.15) return 'deep';
  return 'rich';
}

export function getLipColor(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceLandmarks
): { r: number; g: number; b: number } {
  return getAverageColor(ctx, landmarks.allLipPoints, 3);
}

export function getLipSaturation(lipColor: { r: number; g: number; b: number }): number {
  const max = Math.max(lipColor.r, lipColor.g, lipColor.b);
  const min = Math.min(lipColor.r, lipColor.g, lipColor.b);
  const lightness = (max + min) / 2 / 255;
  if (lightness === 0 || lightness === 1) return 0;
  return (max - min) / (1 - Math.abs(2 * lightness - 1)) / 255;
}

// Smoothing for video mode — stabilize landmarks across frames
export class LandmarkSmoother {
  private history: FaceLandmarks | null = null;
  private readonly alpha: number;

  constructor(smoothingFactor: number = 0.5) {
    this.alpha = smoothingFactor;
  }

  smooth(landmarks: FaceLandmarks): FaceLandmarks {
    if (!this.history) {
      this.history = landmarks;
      return landmarks;
    }

    const lerp = (a: number, b: number) => a * this.alpha + b * (1 - this.alpha);
    const lerpPoints = (curr: { x: number; y: number }[], prev: { x: number; y: number }[]) =>
      curr.map((p, i) => ({
        x: lerp(p.x, prev[i]?.x ?? p.x),
        y: lerp(p.y, prev[i]?.y ?? p.y),
      }));

    const smoothed: FaceLandmarks = {
      ...landmarks,
      upperOuterLip: lerpPoints(landmarks.upperOuterLip, this.history.upperOuterLip),
      lowerOuterLip: lerpPoints(landmarks.lowerOuterLip, this.history.lowerOuterLip),
      upperInnerLip: lerpPoints(landmarks.upperInnerLip, this.history.upperInnerLip),
      lowerInnerLip: lerpPoints(landmarks.lowerInnerLip, this.history.lowerInnerLip),
      allLipPoints: lerpPoints(landmarks.allLipPoints, this.history.allLipPoints),
    };

    this.history = smoothed;
    return smoothed;
  }

  reset() {
    this.history = null;
  }
}
