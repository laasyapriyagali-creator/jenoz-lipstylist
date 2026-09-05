import { useState, useCallback } from 'react';
import LandingPage from '@/components/LandingPage';
import PhotoUpload from '@/components/PhotoUpload';
import AnalyzingScreen from '@/components/AnalyzingScreen';
import VibeSelector from '@/components/VibeSelector';
import ResultScreen from '@/components/ResultScreen';
import type { AppStep, FaceAnalysis, Vibe } from '@/lib/types';
import type { FaceLandmarks } from '@/lib/faceAnalysis';

function App() {
  const [step, setStep] = useState<AppStep>('landing');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [customVibeText, setCustomVibeText] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleStart = useCallback(() => {
    setError('');
    setStep('upload');
  }, []);

  const handleUpload = useCallback((_file: File, dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setError('');
    setStep('analyzing');
  }, []);

  const handleAnalysisComplete = useCallback(
    (result: FaceAnalysis, faceLandmarks: FaceLandmarks | null) => {
      setAnalysis(result);
      setLandmarks(faceLandmarks);
      setStep('vibe');
    },
    []
  );

  const handleAnalysisError = useCallback((message: string) => {
    setError(message);
    setStep('upload');
  }, []);

  const handleVibeSelect = useCallback((selectedVibe: Vibe, customText: string) => {
    setVibe(selectedVibe);
    setCustomVibeText(customText);
    setStep('result');
  }, []);

  const handleRestart = useCallback(() => {
    setStep('landing');
    setImageDataUrl('');
    setAnalysis(null);
    setLandmarks(null);
    setVibe(null);
    setCustomVibeText('');
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-50 via-white to-blush-50">
      {error && step === 'upload' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in-down">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">×</button>
          </div>
        </div>
      )}

      {step === 'landing' && <LandingPage onStart={handleStart} />}

      {step === 'upload' && (
        <PhotoUpload onUpload={handleUpload} onBack={() => setStep('landing')} />
      )}

      {step === 'analyzing' && imageDataUrl && (
        <AnalyzingScreen
          imageDataUrl={imageDataUrl}
          onComplete={handleAnalysisComplete}
          onError={handleAnalysisError}
        />
      )}

      {step === 'vibe' && analysis && (
        <VibeSelector
          analysis={analysis}
          onSelect={handleVibeSelect}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'result' && analysis && vibe && imageDataUrl && (
        <ResultScreen
          imageDataUrl={imageDataUrl}
          analysis={analysis}
          landmarks={landmarks}
          vibe={vibe}
          customVibeText={customVibeText}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
