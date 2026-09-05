import { useRef, useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, Camera } from 'lucide-react';

interface PhotoUploadProps {
  onUpload: (file: File, dataUrl: string) => void;
  onBack: () => void;
}

export default function PhotoUpload({ onUpload, onBack }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Please use an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setSelectedFile(file);
    };
    reader.onerror = () => {
      setError('Could not read the file. Please try a different image.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile && preview) {
      onUpload(selectedFile, preview);
    }
  };

  const handleReset = () => {
    setPreview('');
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-mocha-500 hover:text-mocha-700 transition-colors text-sm font-medium">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div className="w-2 h-2 rounded-full bg-mocha-200" />
          <div className="w-2 h-2 rounded-full bg-mocha-200" />
        </div>
      </div>

      <h2 className="font-serif text-3xl text-mocha-900 mb-2">Upload your selfie</h2>
      <p className="text-mocha-500 mb-8">A clear, front-facing photo with good lighting works best.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center group ${
            dragging
              ? 'border-rose-400 bg-rose-50 scale-[1.02]'
              : 'border-mocha-200 bg-white/50 hover:border-rose-300 hover:bg-blush-50'
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-blush-100 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-9 h-9 text-blush-600" strokeWidth={1.5} />
          </div>
          <p className="font-serif text-xl text-mocha-800 mb-1">Tap to upload</p>
          <p className="text-sm text-mocha-400">or drag and drop a photo here</p>
          <p className="text-xs text-mocha-300 mt-4">JPG, PNG, or WebP up to 10MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-mocha-100 shadow-lg">
            <img src={preview} alt="Your selfie" className="w-full h-auto max-h-[500px] object-contain" />
            <button
              onClick={handleReset}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={handleConfirm} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" />
              Analyze My Face
            </button>
            <button onClick={handleReset} className="btn-secondary">
              Change Photo
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-600 text-sm bg-rose-50 px-4 py-3 rounded-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-8 flex items-start gap-3 text-sm text-mocha-400">
        <ImageIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Your photo is processed in your browser and only stored temporarily for this session. You can delete it at any time.</p>
      </div>
    </div>
  );
}
