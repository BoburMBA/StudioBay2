import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { 
  Music, 
  Play, 
  Pause, 
  RotateCw, 
  Download, 
  Settings,
  Globe,
  Key,
  Cpu,
  Info,
  Sparkles,
  ListMusic,
  Volume2,
  MessageSquare,
  Wand2,
  X,
  Eraser,
  Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Tooltip } from '../components/Tooltip';

interface GeneratedTrack {
  id: string;
  name: string;
  prompt: string;
  url: string;
  coverUrl?: string;
  lyrics?: string;
  createdAt: string;
}

interface AiConfig {
  provider: 'minimax' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  replicateApiKey?: string;
}

const DEFAULT_CONFIG: AiConfig = {
  provider: 'minimax',
  apiKey: '',
  baseUrl: 'https://api.minimax.io/v1/music_generation',
  model: 'music-2.6',
  replicateApiKey: ''
};

const SAMPLE_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
];

const STYLE_PRESETS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Jazz', 'Blues', 'Country',
  'Electronic', 'Classical', 'Folk', 'Reggae', 'Metal', 'Indie',
  'Acoustic', 'Lo-fi', 'Jazz', 'EDM', 'Latin', 'Jazz Funk', 'Soul'
];

export default function MusicGenPage() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [vocalStyle, setVocalStyle] = useState<'male' | 'female' | 'duet' | 'instrumental'>('duet');
  const [showStyles, setShowStyles] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<GeneratedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showLyricsPopup, setShowLyricsPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [history, setHistory] = useState<GeneratedTrack[]>(() => {
    try {
      const stored = localStorage.getItem('studio_assets');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) 
        ? parsed.filter(a => a.type === 'music').map(a => ({
            id: a.id, name: a.name, prompt: a.metadata?.prompt || '', lyrics: a.metadata?.lyrics, url: a.url, coverUrl: a.coverUrl, createdAt: a.createdAt
          }))
        : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<AiConfig>(() => {
    try {
      const saved = localStorage.getItem('studio_music_ai_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleRemix = (track: GeneratedTrack) => {
    setTitle(track.name);
    setPrompt(track.prompt);
    setLyrics(track.lyrics || '');
    // Scroll to top to show populated form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem('studio_music_ai_config', JSON.stringify(config));
  }, [config]);

  const formatTime = (timeInfo: number) => {
    if (!timeInfo || isNaN(timeInfo)) return "0:00";
    const minutes = Math.floor(timeInfo / 60);
    const seconds = Math.floor(timeInfo % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateLyrics = async () => {
    if (!prompt.trim()) {
      setErrorMsg("Please provide a style or description in the Song Description field first.");
      return;
    }

    setIsGeneratingLyrics(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/ai/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, prompt })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (data.text) {
        setLyrics(data.text);
      } else {
        throw new Error("No lyrics returned");
      }
    } catch (error: any) {
      console.error('Lyrics generation failed:', error);
      setErrorMsg(error.message || 'Lyrics generation failed.');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const generateMusic = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setErrorMsg('');

    try {
      let audioUrl = '';
      let coverUrl = '';

      if (config.provider === 'minimax' && config.apiKey) {
        const payload: any = {
           prompt: prompt.trim()
        };

        if (vocalStyle === 'instrumental') {
           payload.is_instrumental = true;
        } else {
           const vocalText = vocalStyle === 'male' ? 'Male vocals' : vocalStyle === 'female' ? 'Female vocals' : 'Male and female duet vocals';
           payload.prompt = `${prompt}, ${vocalText}`.trim();
           if (lyrics) {
              payload.lyrics = lyrics;
           }
        }

        const response = await fetch('/api/ai/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, payload })
        });

        if (!response.ok) {
           throw new Error(await response.text());
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("audio")) {
           const blob = await response.blob();
           audioUrl = URL.createObjectURL(blob);
        } else {
           const data = await response.json();
           if (data.url) {
              audioUrl = data.url;
           } else if (data.data?.audio) {
              audioUrl = data.data.audio;
           } else if (data.data?.audio_base64) {
              audioUrl = `data:audio/mp3;base64,${data.data.audio_base64}`;
           } else if (data.audio) {
              audioUrl = data.audio;
           } else {
              if (data.base_resp && data.base_resp.status_msg) {
                 throw new Error("Minimax API Error: " + data.base_resp.status_msg);
              }
              throw new Error("API succeeded but no audio field found. Response: " + JSON.stringify(data).substring(0, 500));
           }
        }
      } else {
        // Fallback or preview (no API key)
        await new Promise(r => setTimeout(r, 2000));
        audioUrl = SAMPLE_TRACKS[Math.floor(Math.random() * SAMPLE_TRACKS.length)];
      }

      if (!audioUrl) throw new Error('No audio returned');

      const trackTitle = title.trim() || `${prompt.split(',')[0]} Track`;

      // Generate cover image based on song title/prompt
      try {
        const coverResponse = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: { provider: 'pollinations' }, // ALWAYS use free pollinations fallback for track covers, prevents API issues
            prompt: `Music cover art for: ${trackTitle}. ${prompt}. Abstract colorful design, album artwork style`
          })
        });
        if (coverResponse.ok) {
          const coverData = await coverResponse.json();
          if (coverData.urls && coverData.urls.length > 0) {
            coverUrl = coverData.urls[0];
          } else if (coverData.url) {
            coverUrl = coverData.url;
          }
        }
      } catch (coverErr) {
        console.error('Cover generation failed:', coverErr);
      }

      const newTrack: GeneratedTrack = {
        id: crypto.randomUUID(),
        name: trackTitle,
        prompt: prompt,
        url: audioUrl,
        coverUrl: coverUrl,
        createdAt: new Date().toISOString()
      };
      
      // Auto-persist to workspace safely
      let assets = [];
      try {
        const stored = localStorage.getItem('studio_assets');
        if (stored) assets = JSON.parse(stored);
        if (!Array.isArray(assets)) assets = [];
      } catch (e) {
        console.error("Safely parsing assets failed", e);
      }

      const newAsset = {
        id: newTrack.id,
        name: newTrack.name,
        type: 'music',
        url: newTrack.url,
        coverUrl: newTrack.coverUrl,
        createdAt: newTrack.createdAt,
        metadata: { prompt: newTrack.prompt, lyrics: lyrics }
      };
      localStorage.setItem('studio_assets', JSON.stringify([newAsset, ...assets]));

      setCurrentTrack(newTrack);
      setHistory(prev => [newTrack, ...prev]);
      
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#a855f7', '#ffffff']
      });

    } catch (error: any) {
      console.error('Generation failed:', error);
      setErrorMsg(error.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSeparating, setIsSeparating] = useState(false);

  const separateStems = async (track: GeneratedTrack) => {
    if (!config.replicateApiKey) {
      setErrorMsg("Please add your Replicate API Key in AI Config to use Stem Separation.");
      setShowSettings(true);
      return;
    }

    setIsSeparating(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/ai/separate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: track.url, replicateApiKey: config.replicateApiKey })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (!data.stems) throw new Error("No stems returned from separation");

      const newStems: GeneratedTrack[] = [];
      const stemsObj = data.stems;

      // Extract each stem
      for (const [key, audioUrl] of Object.entries(stemsObj)) {
        if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
          const stemTrack: GeneratedTrack = {
            id: crypto.randomUUID(),
            name: `${track.name} (${key.charAt(0).toUpperCase() + key.slice(1)})`,
            prompt: `Extracted ${key} from: ${track.name}`,
            url: audioUrl,
            coverUrl: track.coverUrl,
            createdAt: new Date().toISOString()
          };
          newStems.push(stemTrack);
        }
      }

      if (newStems.length > 0) {
        let assets = [];
        try {
          const stored = localStorage.getItem('studio_assets');
          if (stored) assets = JSON.parse(stored);
          if (!Array.isArray(assets)) assets = [];
        } catch (e) {
          console.error("Safely parsing assets failed", e);
        }

        const newAssets = newStems.map(t => ({
          id: t.id,
          name: t.name,
          type: 'music',
          url: t.url,
          coverUrl: t.coverUrl,
          createdAt: t.createdAt,
          metadata: { prompt: t.prompt }
        }));
        
        localStorage.setItem('studio_assets', JSON.stringify([...newAssets, ...assets]));
        setHistory(prev => [...newStems, ...prev]);
        
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#10b981', '#ffffff']
        });
        
        alert("Stems successfully separated and added to your library!");
      }
    } catch (error: any) {
      console.error('Stem separation failed:', error);
      setErrorMsg("Separation failed: " + (error.message || error));
    } finally {
      setIsSeparating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex h-screen bg-[#07080A] text-white font-sans text-sm overflow-hidden">
      <Navigation />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#07080A]/80 backdrop-blur-xl shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Studio Composer</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">
                {config.provider === 'minimax' ? `Minimax (${config.model || 'music-01'})` : 'Local Fallback'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Tooltip content="Configure AI Engine" position="left">
               <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest ${
                  showSettings 
                    ? 'bg-indigo-500 border-indigo-500 text-white' 
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
               >
                 <Settings className={`w-4 h-4 ${showSettings ? 'animate-spin-slow' : ''}`} />
                 AI Config
               </button>
             </Tooltip>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Controls - Left Sidebar (Suno Style) */}
          <aside className="w-[400px] border-r border-white/5 bg-[#0A0B0E] p-6 flex flex-col custom-scrollbar overflow-y-auto">
            <div className="space-y-6 flex-1">
              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs leading-relaxed font-medium">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Style of Music
                  </label>
                  <div className="flex items-center gap-2">
                    <Tooltip content="Clear Form" position="top">
                      <button
                        onClick={() => {
                          setTitle('');
                          setPrompt('');
                          setLyrics('');
                          setVocalStyle('duet');
                        }}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all flex items-center justify-center group"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <button
                      onClick={() => setShowStyles(!showStyles)}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all"
                    >
                      {showStyles ? 'Hide' : 'Browse'}
                    </button>
                  </div>
                </div>
                {showStyles && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {STYLE_PRESETS.map(style => (
                      <button
                        key={style}
                        onClick={() => setPrompt(p => p ? `${p}, ${style}` : style)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all"
                      >
                        + {style}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the style, mood, or theme of your song..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[80px] text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none transition-all custom-scrollbar font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vocal</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVocalStyle('male')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      vocalStyle === 'male' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => setVocalStyle('female')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      vocalStyle === 'female' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => setVocalStyle('duet')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      vocalStyle === 'duet' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    Duet
                  </button>
                  <button
                    onClick={() => setVocalStyle('instrumental')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      vocalStyle === 'instrumental' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    Instrumental
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your track a name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              {vocalStyle !== 'instrumental' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Lyrics (Optional)</label>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Write your own lyrics here..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[150px] text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none transition-all custom-scrollbar font-medium"
                  />
                </div>
              )}

              <button
                onClick={generateMusic}
                disabled={isGenerating || !prompt.trim()}
                className="mt-8 w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-white/5 disabled:text-white/20 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/10 active:scale-95"
              >
                {isGenerating ? (
                  <><RotateCw className="w-4 h-4 animate-spin" /> Composing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Create Track</>
                )}
              </button>
            </div>
          </aside>

          {/* Right Area - Playlist & Settings */}
          <div className="flex-1 flex flex-col relative bg-[#07080A]">
            
            {/* AI Config Dropdown Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 right-8 w-[340px] bg-[#1A1C20] border border-white/10 rounded-2xl p-6 shadow-2xl z-40 space-y-6"
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Engine Settings</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 flex flex-col">
                       <label className="text-[10px] font-bold text-white/30 uppercase">Provider</label>
                       <div className="grid grid-cols-2 gap-2 mt-1">
                         <button
                           onClick={() => setConfig(c => ({ ...c, provider: 'minimax', baseUrl: 'https://api.minimax.io/v1/music_generation', model: 'music-2.6' }))}
                           className={`py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${
                             config.provider === 'minimax'
                               ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                               : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                           }`}
                         >
                           Minimax
                         </button>
                         <button
                           onClick={() => setConfig(c => ({ ...c, provider: 'custom' }))}
                           className={`py-2 rounded-lg text-[10px] font-bold border transition-all truncate ${
                             config.provider === 'custom'
                               ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                               : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                           }`}
                         >
                           Custom/Local
                         </button>
                       </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                          <Globe className="w-3 h-3" /> Base URL
                        </label>
                        <input 
                          type="text" 
                          value={config.baseUrl}
                          onChange={(e) => setConfig(c => ({ ...c, baseUrl: e.target.value }))}
                          className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-indigo-500/50 outline-none"
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
                          className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-indigo-500/50 outline-none"
                          placeholder="sk-..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                          <Cpu className="w-3 h-3" /> Music Model
                        </label>
                        <input
                          type="text"
                          value={config.model}
                          onChange={(e) => setConfig(c => ({ ...c, model: e.target.value }))}
                          className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-indigo-500/50 outline-none"
                        />
                      </div>
                      
                      <div className="pt-2 pb-2">
                        <div className="h-px bg-white/10 w-full mb-2"></div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase flex items-center gap-2">
                            <Key className="w-3 h-3" /> Replicate API Key (Stems)
                          </label>
                          <input 
                            type="password" 
                            value={config.replicateApiKey || ''}
                            onChange={(e) => setConfig(c => ({ ...c, replicateApiKey: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-white/80 focus:border-indigo-500/50 outline-none"
                            placeholder="r8_..."
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          localStorage.setItem('studio_music_ai_config', JSON.stringify(config));
                          localStorage.setItem('studio_assets', JSON.stringify([]));
                          setShowSettings(false);
                        }}
                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Save Settings & Clear Cache
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Area - Track Player / Feed */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
               {currentTrack && (
                 <div className="mb-12 relative">
                   <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Now Playing</h3>
                   <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-600 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group">
                         {currentTrack.coverUrl ? (
                           <img
                             src={currentTrack.coverUrl}
                             alt={currentTrack.name}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <>
                             <div className="absolute inset-0 bg-black/20" />
                             <Music className="w-12 h-12 text-white/80 z-10" />
                           </>
                         )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left">
                         <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.name}</h2>
                         <p className="text-white/40 text-xs truncate max-w-xl italic">"{currentTrack.prompt}"</p>
                         
                         <div className="mt-8 flex flex-col gap-4">
                           <div className="flex items-center gap-3 w-full">
                              <span className="text-[10px] text-white/40 font-mono w-8 text-right">{formatTime(currentTime)}</span>
                              <input 
                                type="range" 
                                min="0" 
                                max={duration || 100} 
                                value={currentTime}
                                onChange={(e) => {
                                  let newTime = parseFloat(e.target.value);
                                  setCurrentTime(newTime);
                                  if (audioRef.current) audioRef.current.currentTime = newTime;
                                }}
                                className="flex-1 h-1.5 bg-white/10 hover:bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-colors"
                              />
                              <span className="text-[10px] text-white/40 font-mono w-8">{formatTime(duration)}</span>
                           </div>

                           <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center gap-4">
                               <Tooltip content={isPlaying ? "Pause Track" : "Play Track"} position="top">
                                 <button 
                                   onClick={togglePlay}
                                   className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                                 >
                                   {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                                 </button>
                               </Tooltip>
                               <Tooltip content="Download Track">
                                 <a 
                                   href={currentTrack.url}
                                   download={`track-${currentTrack.id}.mp3`}
                                   className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-colors group"
                                 >
                                    <Download className="w-5 h-5 text-white/60 group-hover:text-white" />
                                 </a>
                               </Tooltip>

                               <div className="flex items-center gap-2 group/vol relative ml-2">
                                  <Volume2 className="w-5 h-5 text-white/60 cursor-pointer hover:text-white transition-colors" />
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      setVolume(v);
                                      if (audioRef.current) audioRef.current.volume = v;
                                    }}
                                    className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1.5 bg-white/10 hover:bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                  />
                               </div>
                               
                               {currentTrack.lyrics && (
                                  <Tooltip content="Show Lyrics">
                                    <button
                                      onClick={() => setShowLyricsPopup(!showLyricsPopup)}
                                      className={`ml-2 p-2 rounded-full transition-colors ${showLyricsPopup ? 'bg-indigo-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                    >
                                       <MessageSquare className="w-5 h-5" />
                                    </button>
                                  </Tooltip>
                               )}

                               <Tooltip content="Remix Track Settings">
                                 <button
                                   onClick={() => handleRemix(currentTrack)}
                                   className="ml-2 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                 >
                                    <Wand2 className="w-5 h-5" />
                                 </button>
                               </Tooltip>
                               
                               <Tooltip content="Separate Vocals & Music">
                                 <button
                                   onClick={() => separateStems(currentTrack)}
                                   disabled={isSeparating}
                                   className={`ml-2 p-2 rounded-full transition-colors ${
                                     isSeparating 
                                        ? 'bg-indigo-500/50 text-indigo-200 cursor-not-allowed' 
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                   }`}
                                 >
                                    {isSeparating ? <RotateCw className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                                 </button>
                               </Tooltip>
                             </div>
                             
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest hidden md:inline">Auto-Saved</span>
                             </div>
                           </div>
                         </div>
                      </div>
                   </div>
                   <audio 
                     ref={audioRef} 
                     src={currentTrack.url} 
                     onEnded={() => setIsPlaying(false)}
                     onPlay={() => {
                        setIsPlaying(true);
                        if (audioRef.current && audioRef.current.volume !== volume) {
                           audioRef.current.volume = volume;
                        }
                     }}
                     onPause={() => setIsPlaying(false)}
                     onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                     onLoadedMetadata={() => {
                        setDuration(audioRef.current?.duration || 0);
                        if (audioRef.current) audioRef.current.volume = volume;
                     }}
                     className="hidden"
                     autoPlay
                   />
                   
                   <AnimatePresence>
                      {showLyricsPopup && currentTrack?.lyrics && (
                         <motion.div 
                           drag
                           dragMomentum={false}
                           initial={{ opacity: 0, y: 20, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 20, scale: 0.95 }}
                           className="fixed bottom-12 right-12 w-[320px] max-h-[400px] bg-[#1a1b23] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100] cursor-grab active:cursor-grabbing"
                         >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#121318]">
                               <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2 pointer-events-none">
                                  <MessageSquare className="w-3 h-3" /> Lyrics
                               </h4>
                               <button 
                                 onClick={() => setShowLyricsPopup(false)}
                                 className="text-white/40 hover:text-white transition-colors cursor-pointer z-10"
                                 onPointerDown={(e) => e.stopPropagation()}
                               >
                                 <X className="w-4 h-4" />
                               </button>
                            </div>
                            <div 
                               className="p-5 overflow-y-auto custom-scrollbar font-medium text-white/80 leading-relaxed whitespace-pre-wrap text-sm cursor-auto"
                               onPointerDown={(e) => e.stopPropagation()}
                            >
                               {currentTrack.lyrics}
                            </div>
                         </motion.div>
                      )}
                   </AnimatePresence>
                 </div>
               )}

               <div className="space-y-4">
                 <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Your Library</h3>
                 {history.length === 0 ? (
                   <div className="text-center py-20 border border-white/5 border-dashed rounded-2xl">
                      <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-xs text-white/40 font-medium">Your generated tracks will appear here.</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {history.map((track) => (
                       <div key={track.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer" onClick={() => {
                          setCurrentTrack(track);
                          setIsPlaying(true);
                       }}>
                          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden group-hover:bg-indigo-500 transition-colors">
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Play className="w-5 h-5 text-white/60 group-hover:text-white ml-0.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white/90 truncate">{track.name}</div>
                            <div className="text-[11px] text-white/40 truncate">{track.prompt}</div>
                          </div>
                          <div className="flex items-center gap-3">
                             <Tooltip content="Remix Track" position="top">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleRemix(track);
                                 }}
                                 className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <Wand2 className="w-4 h-4" />
                               </button>
                             </Tooltip>
                             <div className="text-[10px] text-white/20 uppercase tracking-widest hidden sm:block">
                               {new Date(track.createdAt).toLocaleDateString()}
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
