import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Grid, 
  Upload, 
  Trash2, 
  Download, 
  Layout, 
  Maximize,
  Check,
  Plus,
  Settings2,
  Undo2,
  Redo2,
  FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Navigation } from '../components/Navigation';
import { Tooltip } from '../components/Tooltip';

interface GridSlot {
  id: string;
  x: number; // percentage
  y: number; // percentage
  w: number; // percentage
  h: number; // percentage
  image?: string;
  shape?: 'rect' | 'circle' | 'heart' | 'star' | 'diamond' | 'hexagon';
}

interface LayoutTemplate {
  id: string;
  name: string;
  slots: GridSlot[];
  category: 'Grid' | 'Shapes';
}

const SHAPE_PATHS: Record<string, string> = {
  heart: "M12,21.35L10.55,20.03C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z",
  star: "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27z",
  diamond: "M12,2L22,12L12,22L2,12L12,2z",
  hexagon: "M21,12L16.5,19.79L7.5,19.79L3,12L7.5,4.21L16.5,4.21L21,12z"
};

const LAYOUTS: LayoutTemplate[] = [
  {
    id: 'single',
    name: 'Single',
    category: 'Grid',
    slots: [{ id: '1', x: 0, y: 0, w: 100, h: 100 }]
  },
  {
    id: '2-vertical',
    name: '2 Vertical',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 50, h: 100 },
      { id: '2', x: 50, y: 0, w: 50, h: 100 }
    ]
  },
  {
    id: '2-horizontal',
    name: '2 Horizontal',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 100, h: 50 },
      { id: '2', x: 0, y: 50, w: 100, h: 50 }
    ]
  },
  {
    id: '3-grid-classic',
    name: '3 Classic',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 50, h: 100 },
      { id: '2', x: 50, y: 0, w: 50, h: 50 },
      { id: '3', x: 50, y: 50, w: 50, h: 50 }
    ]
  },
  {
    id: '3-vertical',
    name: '3 Vertical',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 33.33, h: 100 },
      { id: '2', x: 33.33, y: 0, w: 33.33, h: 100 },
      { id: '3', x: 66.66, y: 0, w: 33.34, h: 100 }
    ]
  },
  {
    id: '4-squares',
    name: '4 Squares',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 50, h: 50 },
      { id: '2', x: 50, y: 0, w: 50, h: 50 },
      { id: '3', x: 0, y: 50, w: 50, h: 50 },
      { id: '4', x: 50, y: 50, w: 50, h: 50 }
    ]
  },
  {
    id: '4-mixed',
    name: '4 Featured',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 66, h: 66 },
      { id: '2', x: 66, y: 0, w: 34, h: 33 },
      { id: '3', x: 66, y: 33, w: 34, h: 33 },
      { id: '4', x: 0, y: 66, w: 100, h: 34 }
    ]
  },
  {
    id: '6-grid',
    name: '6 Tiles',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 33.33, h: 50 },
      { id: '2', x: 33.33, y: 0, w: 33.33, h: 50 },
      { id: '3', x: 66.66, y: 0, w: 33.34, h: 50 },
      { id: '4', x: 0, y: 50, w: 33.33, h: 50 },
      { id: '5', x: 33.33, y: 50, w: 33.33, h: 50 },
      { id: '6', x: 66.66, y: 50, w: 33.34, h: 50 }
    ]
  },
  {
    id: 'shape-circle-4',
    name: 'Circle 4',
    category: 'Shapes',
    slots: [
      { id: '1', x: 5, y: 5, w: 40, h: 40, shape: 'circle' },
      { id: '2', x: 55, y: 5, w: 40, h: 40, shape: 'circle' },
      { id: '3', x: 5, y: 55, w: 40, h: 40, shape: 'circle' },
      { id: '4', x: 55, y: 55, w: 40, h: 40, shape: 'circle' }
    ]
  },
  {
    id: 'shape-heart-cluster',
    name: 'Heart Cluster',
    category: 'Shapes',
    slots: [
      { id: '1', x: 5, y: 15, w: 45, h: 45, shape: 'heart' },
      { id: '2', x: 50, y: 15, w: 45, h: 45, shape: 'heart' },
      { id: '3', x: 27, y: 45, w: 45, h: 45, shape: 'heart' }
    ]
  },
  {
    id: 'shape-diamond-mix',
    name: 'Diamond Duo',
    category: 'Shapes',
    slots: [
      { id: '1', x: 10, y: 10, w: 80, h: 80, shape: 'diamond' },
      { id: '2', x: 30, y: 30, w: 40, h: 40, shape: 'diamond' }
    ]
  },
  {
    id: 'shape-hexagon-hive',
    name: 'Hex Hive',
    category: 'Shapes',
    slots: [
      { id: '1', x: 33, y: 2, w: 33, h: 33, shape: 'hexagon' },
      { id: '2', x: 10, y: 33, w: 33, h: 33, shape: 'hexagon' },
      { id: '3', x: 56, y: 33, w: 33, h: 33, shape: 'hexagon' },
      { id: '4', x: 33, y: 64, w: 33, h: 33, shape: 'hexagon' }
    ]
  },
  {
    id: 'shape-star-hero',
    name: 'Hero Star',
    category: 'Shapes',
    slots: [{ id: '1', x: 0, y: 0, w: 100, h: 100, shape: 'star' }]
  },
  {
    id: 'shape-heart-solo',
    name: 'Big Love',
    category: 'Shapes',
    slots: [{ id: '1', x: 10, y: 10, w: 80, h: 80, shape: 'heart' }]
  },
  {
    id: '5-grid-left',
    name: '5 Left Focus',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 50, h: 100 },
      { id: '2', x: 50, y: 0, w: 25, h: 50 },
      { id: '3', x: 75, y: 0, w: 25, h: 50 },
      { id: '4', x: 50, y: 50, w: 25, h: 50 },
      { id: '5', x: 75, y: 50, w: 25, h: 50 }
    ]
  },
  {
    id: '5-grid-right',
    name: '5 Right Focus',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 25, h: 50 },
      { id: '2', x: 25, y: 0, w: 25, h: 50 },
      { id: '3', x: 0, y: 50, w: 25, h: 50 },
      { id: '4', x: 25, y: 50, w: 25, h: 50 },
      { id: '5', x: 50, y: 0, w: 50, h: 100 }
    ]
  },
  {
    id: '5-grid-center',
    name: '5 Center Focus',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 33.33, h: 50 },
      { id: '2', x: 0, y: 50, w: 33.33, h: 50 },
      { id: '3', x: 33.33, y: 0, w: 33.33, h: 100 },
      { id: '4', x: 66.66, y: 0, w: 33.34, h: 50 },
      { id: '5', x: 66.66, y: 50, w: 33.34, h: 50 }
    ]
  },
  {
    id: '8-grid',
    name: '8 Grid Classic',
    category: 'Grid',
    slots: [
      { id: '1', x: 0, y: 0, w: 33.33, h: 33.33 },
      { id: '2', x: 33.33, y: 0, w: 33.33, h: 33.33 },
      { id: '3', x: 66.66, y: 0, w: 33.34, h: 33.33 },
      { id: '4', x: 0, y: 33.33, w: 50, h: 33.33 },
      { id: '5', x: 50, y: 33.33, w: 50, h: 33.33 },
      { id: '6', x: 0, y: 66.66, w: 33.33, h: 33.34 },
      { id: '7', x: 33.33, y: 66.66, w: 33.33, h: 33.34 },
      { id: '8', x: 66.66, y: 66.66, w: 33.34, h: 33.34 }
    ]
  },
  {
    id: 'shape-circle-7',
    name: '7 Circles',
    category: 'Shapes',
    slots: [
      { id: '1', x: 30, y: 30, w: 40, h: 40, shape: 'circle' },
      { id: '2', x: 5, y: 5, w: 30, h: 30, shape: 'circle' },
      { id: '3', x: 40, y: 0, w: 20, h: 20, shape: 'circle' },
      { id: '4', x: 65, y: 5, w: 30, h: 30, shape: 'circle' },
      { id: '5', x: 5, y: 65, w: 30, h: 30, shape: 'circle' },
      { id: '6', x: 40, y: 80, w: 20, h: 20, shape: 'circle' },
      { id: '7', x: 65, y: 65, w: 30, h: 30, shape: 'circle' }
    ]
  },
  {
    id: 'shape-hexagon-flower',
    name: 'Hex Flower',
    category: 'Shapes',
    slots: [
      { id: '1', x: 33.5, y: 33.5, w: 33, h: 33, shape: 'hexagon' },
      { id: '2', x: 33.5, y: 2, w: 33, h: 33, shape: 'hexagon' },
      { id: '3', x: 33.5, y: 65, w: 33, h: 33, shape: 'hexagon' },
      { id: '4', x: 6, y: 18, w: 33, h: 33, shape: 'hexagon' },
      { id: '5', x: 61, y: 18, w: 33, h: 33, shape: 'hexagon' },
      { id: '6', x: 6, y: 49, w: 33, h: 33, shape: 'hexagon' },
      { id: '7', x: 61, y: 49, w: 33, h: 33, shape: 'hexagon' }
    ]
  },
  {
    id: 'shape-heart-5',
    name: 'Heart Swarm',
    category: 'Shapes',
    slots: [
      { id: '1', x: 25, y: 25, w: 50, h: 50, shape: 'heart' },
      { id: '2', x: 5, y: 5, w: 30, h: 30, shape: 'heart' },
      { id: '3', x: 65, y: 5, w: 30, h: 30, shape: 'heart' },
      { id: '4', x: 5, y: 65, w: 30, h: 30, shape: 'heart' },
      { id: '5', x: 65, y: 65, w: 30, h: 30, shape: 'heart' }
    ]
  }
];

const ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 0.8 },
  { label: '16:9', value: 1.777 },
  { label: '9:16', value: 0.5625 },
  { label: '3:2', value: 1.5 }
];

const BG_COLORS = [
  { name: 'Dark', value: '#0A0B0D' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Cream', value: '#F5F2ED' },
  { name: 'Orange', value: '#FF6321' },
  { name: 'Soft Blue', value: '#E3F2FD' }
];

interface SlotState {
  url: string;
  scale: number;
  offset: { x: number; y: number };
  fitMode: 'fill' | 'fit';
}

const CollagePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentLayoutId, setCurrentLayoutId] = useState(LAYOUTS[5].id);
  const [currentSlots, setCurrentSlots] = useState<GridSlot[]>(LAYOUTS[5].slots);
  const [slotData, setSlotData] = useState<Record<string, SlotState>>({}); // slotId -> url, scale, offset
  const [spacing, setSpacing] = useState(10);
  const [borderRadius, setBorderRadius] = useState(12);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(BG_COLORS[0].value);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [resizing, setResizing] = useState<{ 
    type: 'v' | 'h', 
    pos: number, 
    affectedIds: string[] 
  } | null>(null);

  // Undo/Redo History
  const [history, setHistory] = useState<Array<{
    currentLayoutId: string;
    currentSlots: GridSlot[];
    slotData: Record<string, SlotState>;
    spacing: number;
    borderRadius: number;
    aspectRatio: number;
    bgColor: string;
  }>>([]);
  const [redoStack, setRedoStack] = useState<typeof history>([]);

  const pushToHistory = () => {
    const currentState = {
      currentLayoutId,
      currentSlots: JSON.parse(JSON.stringify(currentSlots)),
      slotData: JSON.parse(JSON.stringify(slotData)), // Deep copy
      spacing,
      borderRadius,
      aspectRatio,
      bgColor
    };
    
    // Only push if different from last history item
    const lastState = history[history.length - 1];
    if (lastState && JSON.stringify(lastState) === JSON.stringify(currentState)) return;

    setHistory(prev => [...prev, currentState]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const undo = () => {
    if (history.length <= 1) return; // Keep at least one state (the current one)
    
    const newHistory = [...history];
    const currentState = newHistory.pop()!;
    const prevState = newHistory[newHistory.length - 1];

    setRedoStack(prev => [currentState, ...prev]);
    setHistory(newHistory);

    // Apply previous state
    setCurrentLayoutId(prevState.currentLayoutId);
    setCurrentSlots(prevState.currentSlots);
    setSlotData(prevState.slotData);
    setSpacing(prevState.spacing);
    setBorderRadius(prevState.borderRadius);
    setAspectRatio(prevState.aspectRatio);
    setBgColor(prevState.bgColor);
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const newRedoStack = [...redoStack];
    const nextState = newRedoStack.shift()!;

    setHistory(prev => [...prev, nextState]);
    setRedoStack(newRedoStack);

    // Apply next state
    setCurrentLayoutId(nextState.currentLayoutId);
    setCurrentSlots(nextState.currentSlots);
    setSlotData(nextState.slotData);
    setSpacing(nextState.spacing);
    setBorderRadius(nextState.borderRadius);
    setAspectRatio(nextState.aspectRatio);
    setBgColor(nextState.bgColor);
  };

  // Initialize history
  useState(() => {
    setHistory([{
      currentLayoutId,
      currentSlots: LAYOUTS[5].slots,
      slotData: {},
      spacing,
      borderRadius,
      aspectRatio,
      bgColor
    }]);
  });
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack]); // Re-bind when history changes to have fresh refs
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPanning, setIsPanning] = useState<{ slotId: string, startPos: { x: number, y: number }, initialOffset: { x: number, y: number } } | null>(null);

  const handleSlotClick = (e: React.MouseEvent, slotId: string) => {
    setActiveSlot(slotId);
    if (!slotData[slotId]) {
      fileInputRef.current?.click();
    }
  };

  const handleMouseDown = (e: React.MouseEvent, slotId: string) => {
    if (!slotData[slotId]) return;
    e.preventDefault();
    setIsPanning({
      slotId,
      startPos: { x: e.clientX, y: e.clientY },
      initialOffset: { ...slotData[slotId].offset }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizing && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawPos = resizing.type === 'v' 
        ? ((e.clientX - rect.left) / rect.width) * 100 
        : ((e.clientY - rect.top) / rect.height) * 100;
      
      const clampedPos = Math.max(5, Math.min(95, rawPos));
      const oldPos = resizing.pos;

      setCurrentSlots(prev => prev.map(slot => {
        if (!resizing.affectedIds.includes(slot.id)) return slot;
        const newSlot = { ...slot };
        if (resizing.type === 'v') {
          if (Math.abs(slot.x - oldPos) < 0.1) {
            const diff = clampedPos - slot.x;
            newSlot.x = clampedPos;
            newSlot.w = Math.max(5, slot.w - diff);
          } else if (Math.abs((slot.x + slot.w) - oldPos) < 0.1) {
            newSlot.w = Math.max(5, clampedPos - slot.x);
          }
        } else {
          if (Math.abs(slot.y - oldPos) < 0.1) {
            const diff = clampedPos - slot.y;
            newSlot.y = clampedPos;
            newSlot.h = Math.max(5, slot.h - diff);
          } else if (Math.abs((slot.y + slot.h) - oldPos) < 0.1) {
            newSlot.h = Math.max(5, clampedPos - slot.y);
          }
        }
        return newSlot;
      }));
      return;
    }

    if (!isPanning) return;
    
    const container = document.getElementById(`slot-container-${isPanning.slotId}`);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    // Calculate movement relative to slot size
    const deltaX = ((e.clientX - isPanning.startPos.x) / rect.width) * 100;
    const deltaY = ((e.clientY - isPanning.startPos.y) / rect.height) * 100;

    setSlotData(prev => ({
      ...prev,
      [isPanning.slotId]: {
        ...prev[isPanning.slotId],
        offset: {
          x: isPanning.initialOffset.x + deltaX,
          y: isPanning.initialOffset.y + deltaY
        }
      }
    }));
  };

  const handleMouseUp = () => {
    if (isPanning || resizing) {
      pushToHistory();
    }
    setIsPanning(null);
    setResizing(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSlot) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSlotData(prev => ({
          ...prev,
          [activeSlot]: {
            url: event.target?.result as string,
            scale: 1,
            offset: { x: 0, y: 0 },
            fitMode: 'fill'
          }
        }));
        // Small delay to ensure state is updated before capturing history
        setTimeout(pushToHistory, 0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async (archive = false) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 2000;
    canvas.width = size;
    canvas.height = size / aspectRatio;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const exportSpacing = (spacing / 500) * size;
    const exportRadius = (borderRadius / 500) * size;

    const drawPromises = currentSlots.map(slot => {
      return new Promise<void>((resolve) => {
        const data = slotData[slot.id];
        if (!data) {
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => {
          const sx = (slot.x / 100) * canvas.width + exportSpacing;
          const sy = (slot.y / 100) * canvas.height + exportSpacing;
          const sw = (slot.w / 100) * canvas.width - (exportSpacing * 2);
          const sh = (slot.h / 100) * canvas.height - (exportSpacing * 2);

          ctx.save();
          
          if (slot.shape && slot.shape !== 'rect') {
             ctx.beginPath();
             if (slot.shape === 'circle') {
               ctx.arc(sx + sw/2, sy + sh/2, Math.min(sw, sh)/2, 0, Math.PI * 2);
             } else {
                const path = new Path2D(SHAPE_PATHS[slot.shape]);
                ctx.translate(sx, sy);
                ctx.scale(sw / 24, sh / 24);
                ctx.clip(path);
                ctx.setTransform(1, 0, 0, 1, 0, 0); 
             }
             ctx.clip();
          } else {
            ctx.beginPath();
            ctx.moveTo(sx + exportRadius, sy);
            ctx.lineTo(sx + sw - exportRadius, sy);
            ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + exportRadius);
            ctx.lineTo(sx + sw, sy + sh - exportRadius);
            ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - exportRadius, sy + sh);
            ctx.lineTo(sx + exportRadius, sy + sh);
            ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - exportRadius);
            ctx.lineTo(sx, sy + exportRadius);
            ctx.quadraticCurveTo(sx, sy, sx + exportRadius, sy);
            ctx.closePath();
            ctx.clip();
          }

          const imgAspect = img.width / img.height;
          const slotAspect = sw / sh;
          let drawW, drawH;

          const isFit = data.fitMode === 'fit';

          if (imgAspect > slotAspect) {
            if (isFit) {
              drawW = sw * data.scale;
              drawH = (sw / imgAspect) * data.scale;
            } else {
              drawH = sh * data.scale;
              drawW = sh * imgAspect * data.scale;
            }
          } else {
            if (isFit) {
              drawH = sh * data.scale;
              drawW = sh * imgAspect * data.scale;
            } else {
              drawW = sw * data.scale;
              drawH = (sw / imgAspect) * data.scale;
            }
          }

          // Center then apply offsets
          const cx = sx + sw / 2;
          const cy = sy + sh / 2;
          const dx = cx - drawW / 2 + (data.offset.x / 100) * sw;
          const dy = cy - drawH / 2 + (data.offset.y / 100) * sh;

          ctx.drawImage(img, dx, dy, drawW, drawH);
          ctx.restore();
          resolve();
        };
        img.src = data.url;
      });
    });

    await Promise.all(drawPromises);

    const dataUrl = canvas.toDataURL('image/png');
    
    if (archive) {
      const assets = JSON.parse(localStorage.getItem('studio_assets') || '[]');
      const newAsset = {
        id: crypto.randomUUID(),
        name: `Collage ${new Date().toLocaleTimeString()}`,
        type: 'collage',
        url: dataUrl,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('studio_assets', JSON.stringify([...assets, newAsset]));
      alert('Collage archived to workspace!');
      return;
    }

    const link = document.createElement('a');
    link.download = `collage-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    confetti();
  };

  const getClipPath = (slot: GridSlot) => {
    if (!slot.shape || slot.shape === 'rect') return undefined;
    if (slot.shape === 'circle') return 'circle(50% at 50% 50%)';
    if (slot.shape === 'diamond') return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    if (slot.shape === 'hexagon') return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    
    // For heart and star we'd need path() which has browser limits in CSS, 
    // but we can use SVG defs or mask-image. Let's use simpler polygons for cluster types
    if (slot.shape === 'star') return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    return undefined;
  };

  return (
    <div 
      className="h-screen bg-[#0A0B0D] text-white flex overflow-hidden lg:select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Navigation />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0A0B0D]">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0B0D]/80 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Master Grid Active</span>
            </div>

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center gap-1">
              <Tooltip content="Undo (Ctrl+Z)" position="bottom">
                <button 
                  onClick={undo}
                  disabled={history.length <= 1}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                >
                  <Undo2 className="w-4 h-4 text-white/50 group-hover:text-white" />
                </button>
              </Tooltip>
              <Tooltip content="Redo (Ctrl+Y)" position="bottom">
                <button 
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                >
                  <Redo2 className="w-4 h-4 text-white/50 group-hover:text-white" />
                </button>
              </Tooltip>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-12 overflow-auto custom-scrollbar bg-[#0C0D0F] bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]">
          <motion.div
            layout
            ref={containerRef}
            className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden transition-colors duration-500 rounded-sm"
            style={{
              height: '80vh',
              aspectRatio: `${aspectRatio}`,
              padding: spacing,
              backgroundColor: bgColor
            }}
          >
            {currentSlots.map(slot => (
              <div
                key={slot.id}
                onClick={(e) => handleSlotClick(e, slot.id)}
                className={`absolute overflow-hidden group cursor-pointer transition-all duration-300 ${
                  activeSlot === slot.id ? 'ring-2 ring-orange-500 z-20 shadow-2xl' : 'hover:z-10'
                }`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.w}%`,
                  height: `${slot.h}%`,
                  padding: spacing
                }}
              >
                <div 
                  id={`slot-container-${slot.id}`}
                  className={`w-full h-full relative transition-all duration-500 flex items-center justify-center overflow-hidden border border-white/5 ${
                    slotData[slot.id] ? 'bg-black' : 'bg-white/[0.03] group-hover:bg-white/[0.08]'
                  } ${activeSlot === slot.id ? 'bg-black/50 border-orange-500/50' : ''}`}
                  style={{ 
                    borderRadius: slot.shape === 'circle' ? '9999px' : borderRadius,
                    clipPath: getClipPath(slot)
                  }}
                  onMouseDown={(e) => handleMouseDown(e, slot.id)}
                >
                  <AnimatePresence mode="wait">
                    {slotData[slot.id] ? (
                      <div className="w-full h-full relative group">
                        <img 
                          src={slotData[slot.id].url} 
                          className="absolute max-w-none select-none pointer-events-none"
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) translate(${slotData[slot.id].offset.x}%, ${slotData[slot.id].offset.y}%) scale(${slotData[slot.id].scale})`,
                            width: 'auto',
                            height: 'auto',
                            minWidth: slotData[slot.id].fitMode === 'fit' ? '0' : '100%',
                            minHeight: slotData[slot.id].fitMode === 'fit' ? '0' : '100%',
                            maxWidth: slotData[slot.id].fitMode === 'fit' ? '100%' : 'none',
                            maxHeight: slotData[slot.id].fitMode === 'fit' ? '100%' : 'none',
                            objectFit: slotData[slot.id].fitMode === 'fit' ? 'contain' : 'cover'
                          }}
                          alt="Collage piece" 
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               const newSlots = { ...slotData }; 
                               delete newSlots[slot.id]; 
                               setSlotData(newSlots);
                               setTimeout(pushToHistory, 0);
                             }} 
                             className="p-1.5 bg-red-500 rounded-lg text-white hover:scale-110 transition-transform shadow-lg pointer-events-auto"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-white/5 group-hover:text-white/20 transition-colors pointer-events-none">
                        <Upload className="w-8 h-8" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {(() => {
              const xPos = new Set<number>();
              currentSlots.forEach(s => { xPos.add(s.x); xPos.add(s.x + s.w); });
              const xPositions = Array.from(xPos).filter(x => x > 2 && x < 98);
              const verticalDividers = xPositions.map(x => {
                const affectedIds = currentSlots.filter(s => Math.abs(s.x - x) < 0.1 || Math.abs((s.x + s.w) - x) < 0.1).map(s => s.id);
                return { x, affectedIds };
              });
              const yPos = new Set<number>();
              currentSlots.forEach(s => { yPos.add(s.y); yPos.add(s.y + s.h); });
              const yPositions = Array.from(yPos).filter(y => y > 2 && y < 98);
              const horizontalDividers = yPositions.map(y => {
                const affectedIds = currentSlots.filter(s => Math.abs(s.y - y) < 0.1 || Math.abs((s.y + s.h) - y) < 0.1).map(s => s.id);
                return { y, affectedIds };
              });
              return (
                <>
                  {verticalDividers.map((div, i) => (
                    <div 
                      key={`v-${i}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing({ type: 'v', pos: div.x, affectedIds: div.affectedIds });
                      }}
                      className={`absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-30 group flex items-center justify-center transition-all ${resizing?.pos === div.x ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                      style={{ left: `${div.x}%` }}
                    >
                      <div className="w-0.5 h-full bg-orange-500/40 group-hover:bg-orange-500 group-hover:w-1 transition-all" />
                    </div>
                  ))}
                  {horizontalDividers.map((div, i) => (
                    <div 
                      key={`h-${i}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing({ type: 'h', pos: div.y, affectedIds: div.affectedIds });
                      }}
                      className={`absolute left-0 right-0 h-2 -mt-1 cursor-row-resize z-30 group flex items-center justify-center transition-all ${resizing?.pos === div.y ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                      style={{ top: `${div.y}%` }}
                    >
                      <div className="h-0.5 w-full bg-orange-500/40 group-hover:bg-orange-500 group-hover:h-1 transition-all" />
                    </div>
                  ))}
                </>
              );
            })()}
          </motion.div>
        </div>
      </main>

      <aside className="w-72 bg-[#151619] border-l border-white/5 flex flex-col shrink-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          <section className="space-y-4">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Templates</label>
            <div className="grid grid-cols-2 gap-3">
              {LAYOUTS.map(layout => (
                <button
                  key={layout.id}
                  onClick={() => {
                    setCurrentLayoutId(layout.id);
                    setCurrentSlots(layout.slots);
                    setTimeout(pushToHistory, 0);
                  }}
                  className={`aspect-square rounded-xl border transition-all relative overflow-hidden group ${
                    currentLayoutId === layout.id ? 'border-orange-500 bg-orange-500/10' : 'border-white/5 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <div className="absolute inset-2 grid grid-cols-12 grid-rows-12 gap-0.5 opacity-60">
                    {layout.slots.map(slot => (
                      <div
                        key={slot.id}
                        className="bg-white/20 rounded-[2px]"
                        style={{
                          gridColumn: `span ${Math.round((slot.w / 100) * 12)}`,
                          gridRow: `span ${Math.round((slot.h / 100) * 12)}`,
                          clipPath: getClipPath(slot)
                        }}
                      />
                    ))}
                  </div>
                  {currentLayoutId === layout.id && (
                    <div className="absolute top-1 right-1">
                      <Check className="w-3 h-3 text-orange-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Canvas Settings</label>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <span>Spacing</span>
                  <span className="font-mono text-orange-500">{spacing}px</span>
                </div>
                <input type="range" min="0" max="40" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} onMouseUp={pushToHistory} className="w-full accent-orange-500 bg-white/5 h-1 rounded-full cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <span>Corner Radius</span>
                  <span className="font-mono text-orange-500">{borderRadius}px</span>
                </div>
                <input type="range" min="0" max="100" value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} onMouseUp={pushToHistory} className="w-full accent-orange-500 bg-white/5 h-1 rounded-full cursor-pointer" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Background</span>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setBgColor(color.value);
                      setTimeout(pushToHistory, 0);
                    }}
                    title={color.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      bgColor === color.value ? 'border-orange-500' : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Ratio</span>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.label}
                    onClick={() => {
                      setAspectRatio(ratio.value);
                      setTimeout(pushToHistory, 0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      aspectRatio === ratio.value ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {activeSlot && slotData[activeSlot] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-6 border-t border-white/5 space-y-4"
                >
                  <label className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">Image Settings</label>
                  <div className="flex bg-white/5 p-1 rounded-lg">
                    {['fill', 'fit'].map((mode) => (
                      <button 
                        key={mode}
                        onClick={() => {
                          setSlotData(prev => ({ 
                            ...prev, 
                            [activeSlot]: { ...prev[activeSlot], fitMode: mode as 'fill' | 'fit' } 
                          }));
                          setTimeout(pushToHistory, 0);
                        }}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                          slotData[activeSlot].fitMode === mode ? 'bg-orange-500 text-white' : 'text-white/40'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      <span>Zoom</span>
                      <span className="font-mono text-orange-500">{Math.round(slotData[activeSlot].scale * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="5" step="0.05" value={slotData[activeSlot].scale} onChange={(e) => setSlotData(prev => ({ ...prev, [activeSlot]: { ...prev[activeSlot], scale: Number(e.target.value) } }))} onMouseUp={pushToHistory} className="w-full accent-orange-500 bg-white/5 h-1 rounded-full cursor-pointer" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        <div className="p-6 border-t border-white/5 space-y-3">
          <button onClick={() => handleExport(false)} 
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-orange-500/10 active:scale-[0.98] transition-all"
          >
            <Download className="w-5 h-5" /> Export Grid
          </button>
          <button onClick={() => handleExport(true)} 
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <FolderPlus className="w-5 h-5 text-orange-500" /> Archive to Workspace
          </button>
        </div>
      </aside>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
  );
};

export default CollagePage;
