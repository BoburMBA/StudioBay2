import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { 
  Sparkles, 
  Send, 
  Download, 
  Trash2, 
  RefreshCw,
  Image as ImageIcon,
  History,
  Info,
  Settings,
  Globe,
  Key,
  Cpu,
  Square,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Tooltip } from '../components/Tooltip';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

interface AiConfig {
  provider: 'pollinations' | 'openai' | 'minimax';
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIG: AiConfig = {
  provider: 'pollinations',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'dall-e-3'
};

const ASPECT_RATIOS = [
  { label: '16:9', value: '16:9', icon: RectangleHorizontal },
  { label: '4:3', value: '4:3', icon: RectangleHorizontal },
  { label: '1:1', value: '1:1', icon: Square },
  { label: '3:4', value: '3:4', icon: RectangleVertical },
  { label: '9:16', value: '9:16', icon: RectangleVertical },
];

const BATCH_COUNTS = [1, 2, 3, 4];

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [batchSize, setBatchSize] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState<AiConfig>(() => {
    try {
      const saved = localStorage.getItem('studio_ai_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    localStorage.setItem('studio_ai_config', JSON.stringify(config));
  }, [config]);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setCurrentImages([]);

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, prompt, aspectRatio, batchSize })
      });

      if (!response.ok) {
        let errMessage = 'Failed to generate image via proxy';
        try {
          const errorData = await response.json();
          errMessage = errorData.error || errMessage;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      const imageUrls = data.urls || [];
      if (imageUrls.length === 0) throw new Error('No images returned');

      // Preload all generated images
      let loadedUrls: string[] = [];
      await Promise.allSettled(imageUrls.map((url: string) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          const timeout = setTimeout(() => reject('timeout'), 15000);
          img.onload = () => { clearTimeout(timeout); loadedUrls.push(url); resolve(true); };
          img.onerror = () => { clearTimeout(timeout); reject('error'); };
        });
      }));

      // if at least one generated, proceed. 
      if (loadedUrls.length === 0 && imageUrls.length > 0) {
         // Some endpoints return restricted urls or base64. Let's just fallback to the first returned url just in case
         loadedUrls = imageUrls;
      }

      const newImages: GeneratedImage[] = loadedUrls.map(url => ({
        id: crypto.randomUUID(),
        url: url,
        prompt: prompt,
        createdAt: new Date().toISOString()
      }));

      // Auto-persist to workspace safely
      let assets = [];
      try {
        const stored = localStorage.getItem('studio_assets');
        if (stored) assets = JSON.parse(stored);
        if (!Array.isArray(assets)) assets = [];
      } catch (e) {
        console.error("Coroutine error safely parsing assets", e);
      }

      const newAssets = newImages.map(img => ({
        id: img.id,
        name: img.prompt.substring(0, 20) + (img.prompt.length > 20 ? '...' : ''),
        type: 'image',
        url: img.url,
        createdAt: img.createdAt,
        metadata: { prompt: img.prompt }
      }));
      
      localStorage.setItem('studio_assets', JSON.stringify([...newAssets, ...assets]));

      setCurrentImages(newImages); // Preview all in the batch
      setHistory(prev => [...newImages, ...prev]);
      setErrorMsg('');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#ffffff']
      });
    } catch (error: any) {
      console.error('Generation failed:', error);
      setErrorMsg(error.message || 'Generation failed. Please check your AI configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0B0D] text-white overflow-hidden text-sm">
      <Navigation />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0B0D]/80 backdrop-blur-xl shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">AI Vision Studio</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">
                {config.provider === 'openai' ? `OpenAI Compatible (${config.model})` : 
                 config.provider === 'minimax' ? `Minimax (${config.model || 'image-01'})` : 
                 'Free Flux Engine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest ${
                showSettings 
                  ? 'bg-orange-500 border-orange-500 text-white' 
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
             >
               <Settings className={`w-4 h-4 ${showSettings ? 'animate-spin-slow' : ''}`} />
               AI Config
             </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Stage */}
          <div className="flex-1 flex flex-col p-8 bg-[#0C0D0F] relative">
            {/* AI Config Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute top-8 right-8 w-80 bg-[#1A1C20] border border-white/10 rounded-3xl p-6 shadow-2xl z-40 space-y-6"
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">AI Engine Settings</span>
                    <Settings className="w-4 h-4 text-orange-500" />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase">Provider</label>
                       <div className="grid grid-cols-3 gap-2">
                         <button 
                           onClick={() => setConfig(c => ({ ...c, provider: 'pollinations' }))}
                           className={`py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${
                             config.provider === 'pollinations' 
                               ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' 
                               : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                           }`}
                         >
                           Free
                         </button>
                         <button 
                           onClick={() => setConfig(c => ({ ...c, provider: 'openai' }))}
                           className={`py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${
                             config.provider === 'openai' 
                               ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' 
                               : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                           }`}
                         >
                           OpenAI
                         </button>
                         <button 
                           onClick={() => setConfig(c => ({ ...c, provider: 'minimax', baseUrl: 'https://api.minimax.io/v1/image_generation', model: 'image-01' }))}
                           className={`py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${
                             config.provider === 'minimax' 
                               ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' 
                               : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                           }`}
                         >
                           Minimax
                         </button>
                       </div>
                    </div>

                    {(config.provider === 'openai' || config.provider === 'minimax') && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-2 overflow-hidden"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Base URL
                          </label>
                          <input 
                            type="text" 
                            value={config.baseUrl}
                            onChange={(e) => setConfig(c => ({ ...c, baseUrl: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-orange-500/50 outline-none"
                            placeholder={config.provider === 'minimax' ? "https://api.minimax.io/v1/image_generation" : "https://api.openai.com/v1"}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                            <Key className="w-3 h-3" /> API Key
                          </label>
                          <input 
                            type="password" 
                            value={config.apiKey}
                            onChange={(e) => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-orange-500/50 outline-none"
                            placeholder="sk-..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                            <Cpu className="w-3 h-3" /> Model
                          </label>
                          <input 
                            type="text" 
                            value={config.model}
                            onChange={(e) => setConfig(c => ({ ...c, model: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-orange-500/50 outline-none"
                            placeholder={config.provider === 'minimax' ? "image-01" : "dall-e-3"}
                          />
                        </div>

                        <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-2">
                           <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                           <p className="text-[9px] text-white/40 leading-relaxed italic">
                             {config.provider === 'minimax' 
                               ? 'Uses custom Minimax base64 response mapping.' 
                               : 'You can use OpenAI, LocalAI, or any other OAI-compatible API.'}
                           </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-3 bg-white text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-black/20"
                  >
                    Close Settings
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 flex items-center justify-center min-h-0 relative">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="generating"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="relative">
                      <div className="w-32 h-32 border-2 border-orange-500/20 rounded-full animate-[spin_3s_linear_infinite]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2 uppercase tracking-tighter">Manifesting Pixels...</h3>
                      <p className="text-white/30 text-xs italic">"{prompt}"</p>
                    </div>
                  </motion.div>
                ) : currentImages.length > 0 ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl flex items-center justify-center p-4 overflow-y-auto custom-scrollbar max-h-full"
                  >
                    <div className={`grid gap-6 w-full max-w-5xl ${
                      currentImages.length === 1 ? 'grid-cols-1 max-w-2xl' : 
                      currentImages.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                      'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
                    }`}>
                      {currentImages.map(img => (
                        <div key={img.id} className="relative group w-full">
                          <div className={`bg-black rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-white/5 p-3 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent ${
                            aspectRatio === '16:9' ? 'aspect-video' :
                            aspectRatio === '4:3' ? 'aspect-[4/3]' :
                            aspectRatio === '3:4' ? 'aspect-[3/4]' :
                            aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'
                          }`}>
                            <img src={img.url} alt="Generated" className="w-full h-full object-contain rounded-2xl bg-[#0A0B0D]" />
                          </div>
                          
                          <div className="absolute top-6 right-6 flex gap-2">
                            <Tooltip content="Download Image" position="left">
                              <button 
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = img.url;
                                  a.download = `vision-${img.id}.png`;
                                  a.click();
                                }}
                                className="p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-orange-500 transition-all font-bold group/btn shadow-xl flex items-center justify-center"
                              >
                                <Download className="w-5 h-5 group-hover/btn:scale-110 transition-transform text-white/70 group-hover/btn:text-white" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-center max-w-sm"
                  >
                    <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/5 shadow-inner">
                       <ImageIcon className="w-12 h-12 text-white/10" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 tracking-tight">AI Vision Studio</h2>
                    <p className="text-white/40 text-sm leading-relaxed mb-8 font-medium">
                       Describe anything you can imagine. Our intelligence engine will translate your words into high-resolution visuals.
                    </p>
                    <div className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-start gap-3 backdrop-blur-sm">
                       <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                       <p className="text-[11px] text-left text-white/50 leading-relaxed italic">
                         Try: "A cyberpunk city in the rain, neon reflections, cinematic lighting, 8k, hyper-detailed"
                       </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Prompt Bar */}
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 relative z-20 mt-auto">
              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 backdrop-blur-xl mx-auto w-full"
                  >
                    <Info className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-400 text-xs font-medium">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex flex-wrap items-center gap-4 bg-[#141518]/90 border border-white/10 rounded-2xl p-2 w-fit backdrop-blur-xl shadow-2xl mx-auto">
                <div className="flex gap-1 items-center px-1">
                  {ASPECT_RATIOS.map(ratio => {
                    const Icon = ratio.icon;
                    return (
                      <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl gap-1 transition-all ${
                          aspectRatio === ratio.value ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold tracking-wider">{ratio.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="w-[1px] h-8 bg-white/10 hidden sm:block" />

                <div className="flex gap-1 items-center px-1">
                  {BATCH_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setBatchSize(count)}
                      className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all font-bold text-xs ${
                        batchSize === count ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      x{count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2 bg-white/5 rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your vision..."
                      className="w-full bg-transparent border-none rounded-2xl p-6 pr-12 focus:outline-none transition-all resize-none h-20 text-sm custom-scrollbar font-medium text-white placeholder:text-white/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          generateImage();
                        }
                      }}
                    />
                  </div>
                  <button 
                    onClick={generateImage}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-20 h-20 bg-orange-500 hover:bg-orange-600 disabled:bg-white/5 disabled:text-white/10 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/40 active:scale-95 transition-all text-white group shrink-0"
                  >
                    <Send className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar History */}
          <aside className="w-80 border-l border-white/5 bg-[#0C0D0F] hidden xl:flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-white/30" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">History</span>
              </div>
              <button 
                onClick={() => setHistory([])}
                className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              {history.length === 0 ? (
                <div className="text-center py-20">
                   <p className="text-xs text-white/10 italic">No previous generations</p>
                </div>
              ) : (
                history.map((img) => (
                  <div 
                    key={img.id}
                    onClick={() => setCurrentImages([img])}
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-lg ${
                      currentImages.some(ci => ci.id === img.id) ? 'border-orange-500 scale-[1.02]' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img src={img.url} alt="History" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                       <p className="text-[10px] text-white font-bold leading-tight line-clamp-3 uppercase italic tracking-wider">"{img.prompt}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
