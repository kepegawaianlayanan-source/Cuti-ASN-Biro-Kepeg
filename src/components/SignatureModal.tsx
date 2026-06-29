import React, { useRef, useState, useEffect } from 'react';
import { X, Trash2, Upload, PenTool, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { User } from '../types';

interface SignatureModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => Promise<void>;
}

export default function SignatureModal({ user, isOpen, onClose, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas drawing settings
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fill canvas with white color initially (or transparent, but drawing is black on transparent if we don't clear)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Drawing mouse handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Drawing touch handlers for tablets and mobile devices
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    e.preventDefault(); // Prevent scrolling while drawing
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("File harus berupa gambar (PNG/JPG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal adalah 2MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      // Create an image to check dimensions and optionally clean background
      const img = new Image();
      img.onload = () => {
        // Create canvas to resize or optimize signature
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setUploadedImage(canvas.toDataURL('image/png'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save process
  const handleSave = async () => {
    setError(null);
    let signatureDataUrl = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check if canvas is empty
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
      const isCanvasEmpty = !buffer.some(color => color !== 0);

      if (isCanvasEmpty) {
        setError("Silakan gambar tanda tangan Anda terlebih dahulu.");
        return;
      }

      signatureDataUrl = canvas.toDataURL('image/png');
    } else {
      if (!uploadedImage) {
        setError("Silakan pilih gambar tanda tangan Anda terlebih dahulu.");
        return;
      }
      signatureDataUrl = uploadedImage;
    }

    setIsLoading(true);
    try {
      await onSave(signatureDataUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan tanda tangan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-900 no-print">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm sm:text-base">Pengaturan Tanda Tangan Digital</h4>
            <p className="text-[10px] sm:text-xs text-slate-500">Gunakan tanda tangan ini secara otomatis pada dokumen PDF cuti</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Current Signature Display */}
          {user.signature && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanda Tangan Aktif Saat Ini:</span>
              <div className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm max-h-20 flex items-center justify-center">
                <img 
                  src={user.signature} 
                  alt="Tanda Tangan Saat Ini" 
                  className="max-h-16 max-w-[200px] object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setActiveTab('draw'); setError(null); }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 ${
                activeTab === 'draw' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Gambar Tanda Tangan</span>
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setError(null); }}
              className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center space-x-2 ${
                activeTab === 'upload' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah File Gambar</span>
            </button>
          </div>

          {/* Tab Content: DRAW */}
          {activeTab === 'draw' && (
            <div className="space-y-3">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  className="w-full h-[180px] bg-slate-50 border border-dashed border-slate-300 rounded-2xl cursor-crosshair focus:outline-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawingTouch}
                  onTouchMove={drawTouch}
                  onTouchEnd={stopDrawing}
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-[10px] font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic text-center">
                * Gunakan mouse Anda atau sentuh layar langsung (mobile/tablet) untuk melukis tanda tangan Anda di dalam kotak.
              </p>
            </div>
          )}

          {/* Tab Content: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!uploadedImage ? (
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center bg-slate-50 relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-105 transition-all text-slate-400 group-hover:text-blue-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Pilih berkas tanda tangan</span>
                  <span className="text-[10px] text-slate-400 mt-1">Format PNG atau JPG, Maksimal 2MB. Disarankan background transparan atau putih polos.</span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center relative">
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-3 right-3 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all"
                    title="Hapus gambar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pratinjau File Terpilih:</span>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm max-h-36 flex items-center justify-center">
                    <img 
                      src={uploadedImage} 
                      alt="Pratinjau Tanda Tangan" 
                      className="max-h-28 max-w-[280px] object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center space-x-1.5 cursor-pointer"
          >
            {isLoading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Tanda Tangan</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
