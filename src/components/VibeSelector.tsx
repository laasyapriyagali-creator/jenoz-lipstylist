import { useState } from 'react';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { VIBES } from '@/lib/vibes';
import type { Vibe, FaceAnalysis } from '@/lib/types';

interface VibeSelectorProps {
  analysis: FaceAnalysis;
  onSelect: (vibe: Vibe, customText: string) => void;
  onBack: () => void;
}

export default function VibeSelector({ analysis, onSelect, onBack }: VibeSelectorProps) {
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleContinue = () => {
    if (selectedVibe) {
      onSelect(selectedVibe, customText);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-mocha-500 hover:text-mocha-700 transition-colors text-sm font-medium">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div className="w-2 h-2 rounded-full bg-mocha-200" />
        </div>
      </div>

      {/* Analysis summary */}
      <div className="card p-4 mb-8 flex items-center gap-4 animate-fade-in">
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#D4A584' }} title="Skin tone" />
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: analysis.lipColorHex }} title="Lip color" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-mocha-800 capitalize">{analysis.skinTone} skin · {analysis.skinUndertone} undertone</p>
          <p className="text-xs text-mocha-400">Face detected with {Math.round(analysis.confidence * 100)}% confidence</p>
        </div>
      </div>

      <h2 className="font-serif text-3xl text-mocha-900 mb-2">What's the vibe?</h2>
      <p className="text-mocha-500 mb-8">Choose a look or describe your own. Jenoz will create a shade just for you.</p>

      {/* Vibe grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {VIBES.map((vibe) => (
          <button
            key={vibe.id}
            onClick={() => { setSelectedVibe(vibe); setShowCustom(false); }}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
              selectedVibe?.id === vibe.id
                ? 'border-rose-400 bg-rose-50 scale-[1.02]'
                : 'border-mocha-100 bg-white/60 hover:border-rose-200 hover:bg-blush-50'
            }`}
          >
            <div className="text-2xl mb-2">{vibe.emoji}</div>
            <p className="font-serif text-base text-mocha-800">{vibe.label}</p>
            <p className="text-xs text-mocha-400 mt-0.5 leading-tight">{vibe.description}</p>
          </button>
        ))}
      </div>

      {/* Custom vibe input */}
      <div className="mb-8">
        <button
          onClick={() => { setShowCustom(!showCustom); if (!showCustom) setSelectedVibe(VIBES[0]); }}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            showCustom ? 'text-rose-500' : 'text-mocha-500 hover:text-mocha-700'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          {showCustom ? 'Describe your own vibe' : 'Or describe your own vibe'}
        </button>

        {showCustom && (
          <div className="mt-3 animate-fade-in">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. 'Give me a 90s supermodel lip' or 'Something for a night party but not too loud'"
              className="input-field resize-none h-24"
              maxLength={200}
            />
            <p className="text-xs text-mocha-400 mt-1">
              {customText.length}/200 — Describe any aesthetic you want
            </p>
          </div>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selectedVibe}
        className="btn-primary flex items-center justify-center gap-2 self-center px-10"
      >
        <Sparkles className="w-5 h-5" />
        Create My Shade
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
