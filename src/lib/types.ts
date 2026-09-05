export interface FaceAnalysis {
  faceDetected: boolean;
  skinTone: string;
  skinUndertone: 'warm' | 'cool' | 'neutral';
  skinLuminance: number;
  lipColorHex: string;
  lipSaturation: number;
  confidence: number;
  lipConfidence: number;
}

export interface ShadeRecommendation {
  name: string;
  hex: string;
  description: string;
  undertone: string;
  finish: string;
  whyItSuits: string;
  confidence: number;
  colorFamily: string;
}

export interface Vibe {
  id: string;
  label: string;
  emoji: string;
  description: string;
  keywords: string[];
}

export type AppStep = 'landing' | 'upload' | 'analyzing' | 'vibe' | 'result';
