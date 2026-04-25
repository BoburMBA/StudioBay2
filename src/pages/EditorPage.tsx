import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Crop, 
  Lock,
  Unlock,
  AlertTriangle, 
  Download,
  Info,
  Scaling,
  RotateCw,
  LayoutGrid,
  Link2,
  Link2Off
} from 'lucide-react';
import ReactCrop, { type Crop as CropType, PixelCrop } from 'react-image-crop';
import confetti from 'canvas-confetti';
import { processFile, calculateDpi, getResolutionStatus, sharpenImage } from '../lib/imageUtils';
import { ImageData, PrintSettings } from '../types';
import { Navigation } from '../components/Navigation';

export default function EditorPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications' || 
          e.message === 'ResizeObserver loop limit exceeded') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const [image, setImage] = useState<ImageData | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    targetWidthInches: 10,
    targetHeightInches: 10,
    targetDpi: 150
  });
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [editorZoom, setEditorZoom] = useState(1);
  const [aspectLocked, setAspectLocked] = useState(true);
  
  useEffect(() => {
    if (aspectLocked && image) {
      const ratio = image.height / image.width;
      setPrintSettings(p => ({
        ...p,
        targetHeightInches: Number((p.targetWidthInches * ratio).toFixed(2))
      }));
    }
  }, [image, aspectLocked]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await processFile(file);
        const newImage = {
          id: crypto.randomUUID(),
          url: processed.url,
          name: file.name,
          width: processed.width,
          height: processed.height,
          type: file.type
        };
        setImage(newImage);
        setCrop(undefined);
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
  };

  const saveToWorkspace = () => {
    if (!image) return;
    const assets = JSON.parse(localStorage.getItem('studio_assets') || '[]');
    const newAsset = {
      id: image.id,
      name: image.name,
      type: 'image',
      url: image.url,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('studio_assets', JSON.stringify([...assets, newAsset]));
    alert('Project saved to workspace!');
  };

  const handleApplyCrop = () => {
    if (!completedCrop || !imgRef.current || !image) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const newUrl = canvas.toDataURL('image/png');
    setImage({
      ...image,
      url: newUrl,
      width: canvas.width,
      height: canvas.height
    });
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleRotate = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.height;
    canvas.height = image.width;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, -image.width / 2, -image.height / 2);
      const newUrl = canvas.toDataURL('image/png');
      setImage({
        ...image,
        url: newUrl,
        width: canvas.width,
        height: canvas.height
      });
      setCrop(undefined);
    };
    img.src = image.url;
  };

  const hDpi = image ? calculateDpi(image.width, printSettings.targetWidthInches) : 0;
  const vDpi = image ? calculateDpi(image.height, printSettings.targetHeightInches) : 0;
  const currentDpi = image ? Math.min(hDpi, vDpi) : 0;
  const status = getResolutionStatus(currentDpi);

  const handleUpscale = () => {
    if (!image) return;
    setIsUpscaling(true);
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !imgRef.current) return;

      canvas.width = image.width * upscaleFactor;
      canvas.height = image.height * upscaleFactor;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      
      sharpenImage(canvas);
      
      const newUrl = canvas.toDataURL('image/png');
      setImage({
        ...image,
        url: newUrl,
        width: canvas.width,
        height: canvas.height
      });
      setIsUpscaling(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1000);
  };

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.download = `print-ready-${image.name}`;
    link.href = image.url;
    link.click();
  };

  return (
    <div className="flex h-screen overflow-hidden text-sm">
      <Navigation />
      
      {/* Main Canvas Area */}
      <main className="flex-1 bg-[#0A0B0D] relative overflow-hidden flex flex-col">
        {/* Top View Controls */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 z-10 bg-[#0A0B0D]/80 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white/40">
              <span className="text-[10px] font-bold uppercase tracking-widest">Filename:</span>
              <span className="text-xs font-mono text-white/80">{image?.name || 'No file selected'}</span>
            </div>
            {image && (
              <div className="flex items-center gap-2 text-white/40">
                <span className="text-[10px] font-bold uppercase tracking-widest">Dimensions:</span>
                <span className="text-xs font-mono text-white/80">{image.width} × {image.height}px</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {image && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2 gap-2">
                <button 
                  onClick={() => setEditorZoom(1)}
                  className="text-[10px] font-bold text-orange-500 hover:text-orange-400 uppercase tracking-tighter transition-colors"
                >
                  Reset
                </button>
                <div className="w-px h-3 bg-white/10 mx-1" />
                <span className="text-[10px] font-bold text-white/30 uppercase">Zoom</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05" 
                  value={editorZoom} 
                  onChange={(e) => setEditorZoom(Number(e.target.value))}
                  className="w-20 accent-orange-500 cursor-pointer h-1"
                />
                <span className="text-[10px] font-mono text-white/60 w-8">{Math.round(editorZoom * 100)}%</span>
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" /> Replace Image
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative flex items-center justify-center p-12 overflow-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full text-center"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group cursor-pointer border-2 border-dashed border-white/10 rounded-[32px] p-12 hover:border-orange-500/40 hover:bg-orange-500/[0.02] transition-all relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 group-hover:border-orange-500/50 transition-all duration-500">
                      <Upload className="w-10 h-10 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-3">Drop your image here</h2>
                    <p className="text-white/40 leading-relaxed mb-6">Supports JPG, PNG, and TIFF formats. We'll automatically analyze quality for Printful.</p>
                    <span className="bg-white/5 border border-white/10 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Select File</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-h-full max-w-full group"
              >
                <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-orange-500/20" />
                <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-orange-500/20" />
                
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  className="rounded-lg shadow-2xl shadow-black/50"
                >
                  <img 
                    ref={imgRef}
                    src={image.url} 
                    alt="Editor" 
                    className="block object-contain origin-center transition-transform duration-200"
                    style={{ 
                      maxHeight: '70vh',
                      transform: `scale(${editorZoom})`
                    }}
                  />
                </ReactCrop>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Tooltips or Status */}
        {image && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-[10px] uppercase font-bold tracking-[0.2em] text-white/50"
          >
            <Crop className="w-4 h-4 text-orange-500" /> Selective Crop Active
            <span className="w-px h-3 bg-white/20 mx-2" />
            <Scaling className="w-4 h-4 text-orange-500" /> 1:1 Aspect Ratio
          </motion.div>
        )}
      </main>

      {/* Sidebar - Right Side */}
      <aside className="w-80 bg-[#1A1C20] border-l border-white/10 flex flex-col transition-all duration-500">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Workspace Action */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Workspace</label>
            <button 
              onClick={saveToWorkspace}
              disabled={!image}
              className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl border border-orange-500/20 transition-all font-bold group disabled:opacity-50"
            >
              <LayoutGrid className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
              Save to Workspace
            </button>
          </div>

          {/* Print Specs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Print Specifications</label>
              <button 
                onClick={() => setAspectLocked(!aspectLocked)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                  aspectLocked ? 'bg-orange-500/10 text-orange-500' : 'bg-white/5 text-white/30 hover:bg-white/10'
                }`}
              >
                {aspectLocked ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                {aspectLocked ? 'Locked' : 'Unlocked'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 relative">
              <div className="space-y-1.5">
                <span className="text-xs text-white/50">Width (inches)</span>
                <input 
                  type="number" 
                  value={printSettings.targetWidthInches}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (aspectLocked && image) {
                      const ratio = image.height / image.width;
                      setPrintSettings(p => ({ 
                        ...p, 
                        targetWidthInches: val,
                        targetHeightInches: Number((val * ratio).toFixed(2))
                      }));
                    } else {
                      setPrintSettings(p => ({ ...p, targetWidthInches: val }));
                    }
                  }}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-white/50">Height (inches)</span>
                <input 
                  type="number" 
                  value={printSettings.targetHeightInches}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (aspectLocked && image) {
                      const ratio = image.width / image.height;
                      setPrintSettings(p => ({ 
                        ...p, 
                        targetHeightInches: val,
                        targetWidthInches: Number((val * ratio).toFixed(2))
                      }));
                    } else {
                      setPrintSettings(p => ({ ...p, targetHeightInches: val }));
                    }
                  }}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Resolution Monitor */}
          {image && (
            <div className={`p-4 rounded-xl border ${status.bg} border-white/5 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">DPI Monitor</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-4xl font-mono leading-none ${status.color}`}>{currentDpi}</span>
                <span className="text-xs text-white/30 font-medium pb-1">DPI</span>
              </div>
              {image && hDpi !== vDpi && (
                <div className="text-[9px] text-white/40 font-mono flex items-center gap-2 mt-1">
                  <span className="bg-white/5 px-1.5 py-0.5 rounded">W: {hDpi} DPI</span>
                  <span className="bg-white/5 px-1.5 py-0.5 rounded">H: {vDpi} DPI</span>
                </div>
              )}
              {currentDpi < 150 && (
                <div className="flex gap-2 text-[11px] text-red-500/80 leading-relaxed pt-1 border-t border-red-500/10">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p>DPI is below Printful's recommended 150. Image might appear blurry if printed at this size.</p>
                </div>
              )}
            </div>
          )}

          {/* Tools */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Quality Tools</label>
            
            {/* Upscale Settings */}
            <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Target Output DPI</span>
                <div className="flex items-center gap-2">
                   <input 
                    type="number" 
                    value={printSettings.targetDpi}
                    onChange={(e) => setPrintSettings(p => ({ ...p, targetDpi: Number(e.target.value) }))}
                    className="w-16 bg-black/40 border border-white/5 rounded p-1 text-right text-xs font-mono text-orange-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-white/30 uppercase">DPI</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30 font-bold">
                <span>Required Scale</span>
                <span>{Math.max(1, printSettings.targetDpi / (currentDpi || 1)).toFixed(2)}x</span>
              </div>

              <button 
                onClick={() => {
                  const factor = printSettings.targetDpi / (currentDpi || 1);
                  if (factor > 1) {
                    setUpscaleFactor(factor);
                    handleUpscale();
                  }
                }}
                disabled={!image || isUpscaling || (printSettings.targetDpi / (currentDpi || 1) <= 1)}
                className="w-full flex items-center justify-center gap-3 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl border border-orange-500/20 transition-all group mt-2"
              >
                <Scaling className={`w-5 h-5 ${isUpscaling ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="font-semibold">{isUpscaling ? 'Enhancing...' : 'Auto-Enhance to Target'}</span>
              </button>
            </div>

            {completedCrop && (
              <button 
                onClick={handleApplyCrop}
                className="w-full flex items-center justify-center gap-3 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl border border-green-500/20 transition-all group"
              >
                <Crop className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Confirm Selection (Crop)</span>
              </button>
            )}

            <button 
              onClick={handleRotate}
              disabled={!image}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all group"
            >
              <RotateCw className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold">Rotate 90° Clockwise</span>
            </button>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start gap-3">
              <Info className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-white/50 leading-normal">
                Projected Output: <span className="text-orange-500 font-bold">{Math.round(currentDpi * upscaleFactor)} DPI</span> after {upscaleFactor}x enhancement.
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <button 
            onClick={handleDownload}
            disabled={!image}
            className="w-full flex items-center justify-center gap-3 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-white/5 disabled:text-white/20 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all font-bold text-white"
          >
            <Download className="w-5 h-5" /> Export Print Ready
          </button>
        </div>
      </aside>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".jpg,.jpeg,.png,.tiff,.tif"
      />

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#151619]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
