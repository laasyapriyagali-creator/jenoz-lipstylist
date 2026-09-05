import { Sparkles, Scan, Palette, ShoppingBag, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-4xl mx-auto text-center">
        <div className="animate-fade-in-down">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blush-100 rounded-full text-blush-700 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Lip Stylist
          </div>
        </div>

        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl text-mocha-900 font-light leading-[1.1] mb-6 animate-fade-in-up text-balance">
          Find your
          <span className="block italic text-rose-500">perfect lip shade</span>
        </h1>

        <p className="text-lg text-mocha-600 max-w-xl mb-10 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
          Upload a selfie, tell us the vibe you're going for, and Jenoz creates a
          personalized lip shade just for you — then lets you try it on and shop
          the real products.
        </p>

        <button
          onClick={onStart}
          className="btn-primary text-lg px-8 py-4 animate-fade-in-up flex items-center gap-2"
          style={{ animationDelay: '0.2s' }}
        >
          Get Your Shade
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-blush-100 flex items-center justify-center mx-auto mb-4">
              <Scan className="w-7 h-7 text-blush-600" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-mocha-800 mb-1">Upload Selfie</h3>
            <p className="text-sm text-mocha-500">Jenoz analyzes your skin tone, undertone, and natural lip color</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Palette className="w-7 h-7 text-rose-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-mocha-800 mb-1">Choose Your Vibe</h3>
            <p className="text-sm text-mocha-500">Describe the look you want — from 90s brown to bold red</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-mocha-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-mocha-600" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg text-mocha-800 mb-1">Try On & Shop</h3>
            <p className="text-sm text-mocha-500">See it on your photo, then buy the real products that match</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-mocha-400">
        <p>Your photos are analyzed locally and never stored permanently.</p>
      </footer>
    </div>
  );
}
