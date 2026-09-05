import { useEffect, useRef, useState } from 'react';
import { RotateCcw, ShoppingBag, ExternalLink, Check, AlertCircle, Loader2, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import type { FaceAnalysis, ShadeRecommendation, Vibe } from '@/lib/types';
import type { FaceLandmarks } from '@/lib/faceAnalysis';
import { generateShadeRecommendation, generateAlternativeShades } from '@/lib/shadeEngine';
import { fetchMatchingProducts, getProductMatchScore, formatPrice } from '@/lib/productMatching';
import { applyLipColor, type LipFinish } from '@/lib/virtualTryOn';
import { supabase, type Product } from '@/lib/supabase';

interface ResultScreenProps {
  imageDataUrl: string;
  analysis: FaceAnalysis;
  landmarks: FaceLandmarks | null;
  vibe: Vibe;
  customVibeText: string;
  onRestart: () => void;
}

const LIP_CONFIDENCE_THRESHOLD = 0.4;

export default function ResultScreen({
  imageDataUrl,
  analysis,
  landmarks,
  vibe,
  customVibeText,
  onRestart,
}: ResultScreenProps) {
  const [primaryShade, setPrimaryShade] = useState<ShadeRecommendation | null>(null);
  const [, setAlternatives] = useState<ShadeRecommendation[]>([]);
  const [allShades, setAllShades] = useState<ShadeRecommendation[]>([]);
  const [activeShadeIndex, setActiveShadeIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tryOnIntensity, setTryOnIntensity] = useState(0.65);
  const [showTryOn, setShowTryOn] = useState(true);
  const [scanId, setScanId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determine if lip try-on is available
  const lipTryOnAvailable = !!landmarks && analysis.lipConfidence >= LIP_CONFIDENCE_THRESHOLD;

  // Map shade finish string to LipFinish type
  const mapFinish = (finish: string): LipFinish => {
    if (finish === 'matte') return 'matte';
    if (finish === 'glossy') return 'gloss';
    if (finish === 'satin') return 'satin';
    if (finish === 'sheer') return 'tint';
    return 'satin';
  };

  // Generate shade recommendations
  useEffect(() => {
    const primary = generateShadeRecommendation(analysis, vibe, customVibeText);
    const alts = generateAlternativeShades(analysis, vibe, primary, customVibeText);
    setPrimaryShade(primary);
    setAlternatives(alts);
    setAllShades([primary, ...alts]);
  }, [analysis, vibe, customVibeText]);

  // Save scan to database
  useEffect(() => {
    if (!primaryShade) return;
    const saveScan = async () => {
      const img = imgRef.current;
      let thumbnail = null;
      if (img && img.complete) {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 200;
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
        thumbCanvas.width = img.naturalWidth * scale;
        thumbCanvas.height = img.naturalHeight * scale;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
          thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
        }
      }

      const { data } = await supabase.from('scans').insert({
        image_data: thumbnail,
        skin_tone: analysis.skinTone,
        skin_undertone: analysis.skinUndertone,
        lip_color_hex: analysis.lipColorHex,
        face_detected: analysis.faceDetected,
        vibe: vibe.id,
        recommended_shade_name: primaryShade.name,
        recommended_shade_hex: primaryShade.hex,
        recommended_shade_description: primaryShade.description,
      }).select('id').maybeSingle();

      if (data) setScanId(data.id);
    };
    saveScan();
  }, [primaryShade, analysis, vibe]);

  // Fetch matching products
  useEffect(() => {
    if (!primaryShade) return;
    const loadProducts = async () => {
      setLoadingProducts(true);
      const matched = await fetchMatchingProducts(primaryShade);
      setProducts(matched);
      setLoadingProducts(false);
    };
    loadProducts();
  }, [primaryShade]);

  // Render virtual try-on
  useEffect(() => {
    if (!imageLoaded || !allShades.length) return;
    if (!lipTryOnAvailable) return;

    setRendering(true);

    // Use requestAnimationFrame to avoid blocking the UI
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) {
        setRendering(false);
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setRendering(false);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply lip color
      if (showTryOn && landmarks) {
        const activeShade = allShades[activeShadeIndex];
        if (activeShade) {
          applyLipColor(ctx, landmarks, activeShade.hex, {
            opacity: tryOnIntensity,
            finish: mapFinish(activeShade.finish),
            featherRadius: 2,
          });
        }
      }

      setRendering(false);
    });
  }, [imageLoaded, allShades, activeShadeIndex, landmarks, tryOnIntensity, showTryOn, lipTryOnAvailable]);

  const handleDeleteScan = async () => {
    if (scanId) {
      await supabase.from('scans').delete().eq('id', scanId);
    }
    onRestart();
  };

  if (!primaryShade) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  const activeShade = allShades[activeShadeIndex];

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onRestart} className="flex items-center gap-2 text-mocha-500 hover:text-mocha-700 transition-colors text-sm font-medium">
          <RotateCcw className="w-4 h-4" />
          Start Over
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div className="w-2 h-2 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Main result */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Try-on preview */}
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-mocha-100 shadow-xl">
            {lipTryOnAvailable ? (
              <>
                <canvas ref={canvasRef} className="w-full h-auto block" />
                <img
                  ref={imgRef}
                  src={imageDataUrl}
                  alt="Original"
                  className="hidden"
                  onLoad={() => setImageLoaded(true)}
                  crossOrigin="anonymous"
                />
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  </div>
                )}
              </>
            ) : (
              <>
                <img
                  ref={imgRef}
                  src={imageDataUrl}
                  alt="Original"
                  className="w-full h-auto block"
                  onLoad={() => setImageLoaded(true)}
                  crossOrigin="anonymous"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-rose-900/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-100 text-xs leading-relaxed">
                    {analysis.faceDetected
                      ? "We couldn't detect your lips clearly enough for virtual try-on. Try a front-facing photo with better lighting for this feature."
                      : "Face not detected — virtual try-on unavailable. Shade recommendation is still based on your photo's color analysis."}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Try-on controls */}
          {lipTryOnAvailable && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-mocha-700">Try-on intensity</span>
                <span className="text-xs text-mocha-400">{Math.round(tryOnIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                value={Math.round(tryOnIntensity * 100)}
                onChange={(e) => setTryOnIntensity(parseInt(e.target.value) / 100)}
                className="w-full accent-rose-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTryOn(true)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${showTryOn ? 'bg-rose-500 text-white' : 'bg-mocha-100 text-mocha-500'}`}
                >
                  With Shade
                </button>
                <button
                  onClick={() => setShowTryOn(false)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${!showTryOn ? 'bg-rose-500 text-white' : 'bg-mocha-100 text-mocha-500'}`}
                >
                  Original
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Shade recommendation */}
        <div className="space-y-4">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 rounded-full text-rose-600 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Your Personalized Shade
            </div>
            <h2 className="font-serif text-3xl text-mocha-900 mb-1">{activeShade.name}</h2>
            <p className="text-sm text-mocha-500 capitalize">{activeShade.finish} finish · {activeShade.colorFamily} family</p>
          </div>

          {/* Shade swatch */}
          <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div
              className="w-20 h-20 rounded-2xl shadow-lg border-4 border-white flex-shrink-0"
              style={{ backgroundColor: activeShade.hex }}
            />
            <div>
              <p className="text-xs text-mocha-400 uppercase tracking-wide">Shade Code</p>
              <p className="font-mono text-lg text-mocha-800 uppercase">{activeShade.hex}</p>
              <p className="text-xs text-mocha-400 capitalize">{activeShade.undertone} undertone</p>
            </div>
          </div>

          {/* Description */}
          <div className="card p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-sm text-mocha-600 leading-relaxed">{activeShade.description}</p>
          </div>

          {/* Why it suits */}
          <div className="card p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h4 className="text-sm font-semibold text-mocha-700 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-rose-500" />
              Why this suits you
            </h4>
            <p className="text-sm text-mocha-600 leading-relaxed">{activeShade.whyItSuits}</p>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-2 text-xs text-mocha-400 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex-1 h-1.5 bg-mocha-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full" style={{ width: `${activeShade.confidence}%` }} />
            </div>
            <span>{activeShade.confidence}% match</span>
          </div>
        </div>
      </div>

      {/* Shade alternatives */}
      {allShades.length > 1 && (
        <div className="mb-12">
          <h3 className="font-serif text-xl text-mocha-800 mb-4">Compare shades</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {allShades.map((shade, i) => (
              <button
                key={i}
                onClick={() => setActiveShadeIndex(i)}
                className={`flex-shrink-0 w-32 p-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                  i === activeShadeIndex
                    ? 'border-rose-400 bg-rose-50 scale-[1.02]'
                    : 'border-mocha-100 bg-white/60 hover:border-rose-200'
                }`}
              >
                <div className="w-full h-16 rounded-xl mb-2 shadow-sm" style={{ backgroundColor: shade.hex }} />
                <p className="text-xs font-medium text-mocha-800 truncate">{shade.name}</p>
                <p className="text-[10px] text-mocha-400 capitalize">{shade.finish}</p>
                {i === 0 && <p className="text-[10px] text-rose-500 font-medium mt-0.5">Best match</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag className="w-5 h-5 text-rose-500" />
          <h3 className="font-serif text-xl text-mocha-800">Shop the look</h3>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            <span className="ml-2 text-mocha-400 text-sm">Finding matching products...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="card p-8 text-center">
            <AlertCircle className="w-8 h-8 text-mocha-300 mx-auto mb-2" />
            <p className="text-mocha-500 text-sm">No products found for this shade. Try a different vibe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const matchScore = getProductMatchScore(product, activeShade.hex);
              return (
                <div key={product.id} className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  {/* Color swatch + match badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-xl shadow-sm border border-mocha-100"
                        style={{ backgroundColor: product.color_hex }}
                      />
                      <div>
                        <p className="text-[10px] text-mocha-400 uppercase tracking-wide">{product.type.replace('_', ' ')}</p>
                        <p className="text-xs text-mocha-500 capitalize">{product.finish} finish</p>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 bg-rose-50 rounded-full">
                      <span className="text-[10px] font-medium text-rose-600">{matchScore}% match</span>
                    </div>
                  </div>

                  {/* Product info */}
                  <div>
                    <p className="text-xs text-mocha-400 font-medium">{product.brand}</p>
                    <p className="text-sm font-medium text-mocha-800 leading-tight">{product.name}</p>
                    <p className="text-sm text-mocha-500">in {product.shade}</p>
                  </div>

                  {/* Price + buy */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-sm font-semibold text-mocha-800">{formatPrice(product.price)}</span>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-mocha-800 text-white text-xs font-medium rounded-full hover:bg-mocha-900 transition-colors"
                    >
                      Buy at {product.store}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {!product.in_stock && (
                    <p className="text-xs text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Check availability at store
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Privacy footer */}
      <div className="flex items-center justify-between pt-6 border-t border-mocha-100">
        <p className="text-xs text-mocha-400">
          Your scan data is saved temporarily. You can delete it anytime.
        </p>
        <button
          onClick={handleDeleteScan}
          className="flex items-center gap-1.5 text-xs text-mocha-400 hover:text-rose-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete my data
        </button>
      </div>
    </div>
  );
}
