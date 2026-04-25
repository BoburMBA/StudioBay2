import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Music, 
  FolderKanban, 
  LayoutGrid,
  Scissors
} from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { id: 'dashboard', label: 'Editor', icon: Scissors, path: '/' },
  { id: 'collage', label: 'Collage', icon: LayoutGrid, path: '/collage' },
  { id: 'image-gen', label: 'AI Image', icon: ImageIcon, path: '/image-gen' },
  { id: 'music-gen', label: 'AI Music', icon: Music, path: '/music-gen' },
  { id: 'workspace', label: 'Workspace', icon: FolderKanban, path: '/workspace' },
];

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-20 lg:w-64 bg-[#151619] border-r border-white/5 flex flex-col shrink-0 z-50">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <LayoutDashboard className="text-white w-5 h-5" />
        </div>
        <h1 className="font-bold text-sm tracking-tight hidden lg:block uppercase text-white/90">Studio Suite</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-orange-500' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="font-bold text-xs uppercase tracking-widest hidden lg:block">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full lg:hidden"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-4 hidden lg:block">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Storage</p>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 w-1/3" />
          </div>
          <p className="text-[10px] text-white/20 mt-2 italic text-right">32% Used</p>
        </div>
      </div>
    </aside>
  );
};
