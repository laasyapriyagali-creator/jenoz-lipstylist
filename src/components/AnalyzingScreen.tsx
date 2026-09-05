import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Scan, Sparkles } from 'lucide-react';
import { loadFaceModels, detectFace, getSkinColor, getLipColor, determineUndertone, determineSkinTone, getLipSaturation, rgbToHex, type FaceLandmarks } from '@/lib/faceAnalysis';
import type { FaceAnalysis } from '@/lib/types';

interface AnalyzingScreenProps {
  imageDataUrl: string;
  onComplete: (analysis: FaceAnalysis, landmarks: FaceLandmarks | null) => void;
  onError: (message: string) => void;
}

const STEPS = [
  { label: 'Loading AI models', icon: Sparkles },
  { label: 'Detecting face landmarks', icon: Scan },
  { label: 'Analyzing skin tone', icon: Scan },
  { label: 'Reading lip color', icon: Scan },
  { label: 'Creating your profile', icon: CheckCircle2 },
];

export default function AnalyzingScreen({ imageDataUrl, onComplete, onError }: AnalyzingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        // Step 1: Load models
        setCurrentStep(0);
        await loadFaceModels();
        await new Promise(r => setTimeout(r, 400));

        // Wait for image to be loaded
        const img = imgRef.current;
        if (!img) {
          onError('Could not load image. Please try again.');
          return;
        }

        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });

        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          onError('Could not load image. Please try a different photo.');
          return;
        }

        // Step 2: Detect face with MediaPipe
        setCurrentStep(1);
        await new Promise(r => setTimeout(r, 600));

        const landmarks = await detectFace(img);

        // Step 3: Analyze skin tone
        setCurrentStep(2);
        await new Promise(r => setTimeout(r, 500));

        // Create canvas to extract pixel data
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          onError('Could not analyze image. Please try a different photo.');
          return;
        }
        ctx.drawImage(img, 0, 0);

        let skinColor = { r: 200, g: 170, b: 150 };
        let lipColor = { r: 180, g: 100, b: 100 };
        let lipColorHex = '#B46464';
        let lipSaturation = 0.3;
        let confidence = 0.5;
        let lipConfidence = 0;

        if (landmarks) {
          skinColor = getSkinColor(ctx, landmarks);
          lipColor = getLipColor(ctx, landmarks);
          lipColorHex = rgbToHex(lipColor.r, lipColor.g, lipColor.b);
          lipSaturation = getLipSaturation(lipColor);
          confidence = landmarks.confidence;
          lipConfidence = landmarks.lipConfidence;
        }

        const undertone = determineUndertone(skinColor);
        const skinTone = determineSkinTone(skinColor);
        const luminance = (0.299 * skinColor.r + 0.587 * skinColor.g + 0.114 * skinColor.b) / 255;

        // Step 4: Reading lip color
        setCurrentStep(3);
        await new Promise(r => setTimeout(r, 500));

        // Step 5: Creating profile
        setCurrentStep(4);
        await new Promise(r => setTimeout(r, 500));

        const analysis: FaceAnalysis = {
          faceDetected: !!landmarks,
          skinTone,
          skinUndertone: undertone,
          skinLuminance: luminance,
          lipColorHex,
          lipSaturation,
          confidence,
          lipConfidence,
        };

        onComplete(analysis, landmarks);
      } catch {
        onError('Could not analyze your photo. Please try a clearer, well-lit selfie.');
      }
    };

    runAnalysis();
  }, [imageDataUrl, onComplete, onError]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto">
      <div className="relative w-full max-w-sm mb-10">
        <div className="relative rounded-3xl overflow-hidden bg-mocha-100 shadow-xl">
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Analyzing"
            className="w-full h-auto"
            crossOrigin="anonymous"
          />
          {/* Scan line overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-b from-transparent via-rose-400/80 to-transparent animate-scan-line" style={{ top: '0%' }} />
          </div>
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-rose-400/60 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-rose-400/60 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-rose-400/60 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-rose-400/60 rounded-br-lg" />
        </div>
      </div>

      <h2 className="font-serif text-2xl text-mocha-900 mb-6">Analyzing your face</h2>

      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isDone || isActive ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                isDone ? 'bg-rose-500 text-white' : isActive ? 'bg-rose-100 text-rose-500' : 'bg-mocha-100 text-mocha-400'
              }`}>
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />}
              </div>
              <span className={`text-sm font-medium transition-colors duration-300 ${
                isDone ? 'text-mocha-800' : isActive ? 'text-mocha-700' : 'text-mocha-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
