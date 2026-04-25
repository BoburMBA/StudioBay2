import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { 
  Folder, 
  Image as ImageIcon, 
  Music, 
  LayoutGrid, 
  Search, 
  MoreVertical,
  Download,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlignJustify,
  Grid3X3,
  List,
  LayoutList,
  X,
  Settings2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'music' | 'collage';
  url: string;
  coverUrl?: string;
  createdAt: string;
  metadata?: any;
}

export default function WorkspacePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'music' | 'collage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'large' | 'medium' | 'small' | 'list'>('medium');
  const [showViewMenu, setShowViewMenu] = useState(false);

  useEffect(() => {
    // Load assets from localStorage safely
    try {
      const savedAssets = JSON.parse(localStorage.getItem('studio_assets') || '[]');
      setAssets(Array.isArray(savedAssets) ? savedAssets : []);
    } catch (e) {
      console.error("Failed to parse assets from localStorage", e);
      setAssets([]);
    }
  }, []);

  const deleteAsset = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    localStorage.setItem('studio_assets', JSON.stringify(updated));
  };

  const handleDownload = (asset: Asset) => {
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = `${asset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${asset.id}.${asset.type === 'music' ? 'mp3' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleView = (asset: Asset) => {
    if (asset.url.startsWith('data:')) {
      // Data URLs (like canvas exports) cannot be opened in new tabs natively in modern browsers.
      // Show them in a modal instead.
      setViewingAsset(asset);
    } else {
      window.open(asset.url, '_blank');
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesFilter = filter === 'all' || a.type === filter;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    image: assets.filter(a => a.type === 'image').length,
    music: assets.filter(a => a.type === 'music').length,
    collage: assets.filter(a => a.type === 'collage').length,
  };

  return (
    <div className="flex h-screen bg-[#0A0B0D] text-white overflow-hidden">
      <Navigation />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0B0D]/80 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Personal Workspace</h1>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:flex gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5">
                {assets.length} Total Assets
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500/30 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
             <button 
               onClick={() => setShowViewMenu(!showViewMenu)}
               className="px-3 py-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/70 hover:text-white transition-all flex items-center gap-2 text-sm font-medium"
             >
                <LayoutGrid className="w-4 h-4" /> View <ChevronDown className="w-3 h-3 ml-1" />
             </button>
             
             <AnimatePresence>
                {showViewMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
                  >
                     <button onClick={() => { setViewMode('large'); setShowViewMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                        <LayoutGrid className="w-4 h-4" /> Large icons
                        {viewMode === 'large' && <Check className="w-4 h-4 ml-auto" />}
                     </button>
                     <button onClick={() => { setViewMode('medium'); setShowViewMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                        <Grid3X3 className="w-4 h-4" /> Medium icons
                        {viewMode === 'medium' && <Check className="w-4 h-4 ml-auto" />}
                     </button>
                     <button onClick={() => { setViewMode('small'); setShowViewMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                        <Grid3X3 className="w-4 h-4 opacity-75 transform scale-75" /> Small icons
                        {viewMode === 'small' && <Check className="w-4 h-4 ml-auto" />}
                     </button>
                     <div className="h-px bg-white/10 my-1 mx-2" />
                     <button onClick={() => { setViewMode('list'); setShowViewMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                        <List className="w-4 h-4" /> List
                        {viewMode === 'list' && <Check className="w-4 h-4 ml-auto" />}
                     </button>
                  </motion.div>
                )}
             </AnimatePresence>
             <button className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/50 hover:text-white transition-all">
                <Settings2 className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* Folders Section */}
          <section className="mb-12">
            <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-6">Archive Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { type: 'all', label: 'All Assets', count: assets.length, icon: Folder, color: 'text-white' },
                { type: 'image', label: 'Generated Images', count: stats.image, icon: ImageIcon, color: 'text-blue-500' },
                { type: 'music', label: 'AI Music Tracks', count: stats.music, icon: Music, color: 'text-indigo-500' },
                { type: 'collage', label: 'Saved Collages', count: stats.collage, icon: LayoutGrid, color: 'text-orange-500' },
              ].map((folder) => (
                <button
                  key={folder.type}
                  onClick={() => setFilter(folder.type as any)}
                  className={`p-6 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                    filter === folder.type 
                      ? 'bg-white/10 border-white/20 ring-1 ring-orange-500/20' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 transition-transform ${folder.color}`}>
                    <folder.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white/90">{folder.label}</h3>
                    <p className="text-xs text-white/30 mt-1">{folder.count} items</p>
                  </div>
                  <ChevronRight className={`absolute bottom-6 right-6 w-4 h-4 text-white/20 transition-all ${filter === folder.type ? 'translate-x-0' : '-translate-x-2'}`} />
                </button>
              ))}
            </div>
          </section>

          {/* Recent Assets */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Recent Items</h2>
              <div className="flex gap-2">
                <button className="text-[10px] font-bold text-orange-500 uppercase tracking-widest hover:underline transition-all">View All</button>
              </div>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/5">
                <Folder className="w-12 h-12 text-white/5 mb-4" />
                <p className="text-white/40 font-medium italic">No items found in this section</p>
              </div>
            ) : (
              <div className={
                 viewMode === 'large' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6" :
                 viewMode === 'medium' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" :
                 viewMode === 'small' ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3" :
                 "flex flex-col gap-3" // list view
              }>
                <AnimatePresence>
                  {filteredAssets.map((asset) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`group bg-[#151619] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all ${
                         viewMode === 'list' ? 'flex items-center p-3 gap-4 h-20' : 'flex flex-col'
                      }`}
                    >
                      <div className={`bg-black relative flex items-center justify-center overflow-hidden shrink-0 ${
                         viewMode === 'list' ? 'w-14 h-14 rounded-xl' :
                         viewMode === 'small' ? 'aspect-square' :
                         'aspect-[4/3] w-full'
                      }`}>
                        {asset.type === 'image' || asset.type === 'collage' || (asset.type === 'music' && asset.coverUrl) ? (
                          <img src={asset.coverUrl || asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center">
                            <Music className={viewMode === 'list' || viewMode === 'small' ? "w-6 h-6 text-indigo-500/40" : "w-12 h-12 text-indigo-500/40"} />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleView(asset)}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 transition-all scale-75 md:scale-100"
                          >
                            <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          {viewMode !== 'list' && viewMode !== 'small' && (
                             <button 
                                onClick={() => deleteAsset(asset.id)}
                                className="w-10 h-10 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-xl flex items-center justify-center backdrop-blur-md border border-red-500/20 transition-all scale-75 md:scale-100"
                             >
                               <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                             </button>
                          )}
                        </div>

                        {viewMode !== 'small' && viewMode !== 'list' && (
                          <div className="absolute top-4 left-4">
                             <span className="text-[9px] font-bold text-white uppercase tracking-widest bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                                {asset.type}
                             </span>
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center justify-between ${
                         viewMode === 'list' ? 'flex-1 min-w-0' :
                         viewMode === 'small' ? 'p-2' :
                         'p-4'
                      }`}>
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-bold truncate text-white/90 ${viewMode === 'small' ? 'text-xs' : 'text-sm'}`}>{asset.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             {viewMode === 'list' && (
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded mr-2">
                                   {asset.type}
                                </span>
                             )}
                             <p className={`text-white/30 truncate ${viewMode === 'small' ? 'text-[9px]' : 'text-[10px]'}`}>{new Date(asset.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {viewMode !== 'small' && (
                           <div className="flex gap-2 shrink-0 ml-4">
                              {viewMode === 'list' && (
                                <button 
                                  onClick={() => deleteAsset(asset.id)}
                                  className="p-2 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDownload(asset)}
                                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all shadow-sm"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                           </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Viewing Modal for Data URLs (Collages) */}
      <AnimatePresence>
        {viewingAsset && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setViewingAsset(null)}
          >
             <div className="absolute top-8 right-8 flex gap-4">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(viewingAsset);
                 }}
                 className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-md"
               >
                 <Download className="w-6 h-6" />
               </button>
               <button 
                 onClick={() => setViewingAsset(null)}
                 className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-md"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>
             
             <motion.img 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               src={viewingAsset.url} 
               alt={viewingAsset.name} 
               className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
               onClick={(e) => e.stopPropagation()}
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
