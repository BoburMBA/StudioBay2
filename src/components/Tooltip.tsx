import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ children, content, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const getExitInitialState = () => {
     switch (position) {
        case 'top': return { opacity: 0, scale: 0.95, y: 5 };
        case 'bottom': return { opacity: 0, scale: 0.95, y: -5 };
        case 'left': return { opacity: 0, scale: 0.95, x: 5 };
        case 'right': return { opacity: 0, scale: 0.95, x: -5 };
     }
  };

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            initial={getExitInitialState()}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={getExitInitialState()}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${positionClasses[position]} z-50 pointer-events-none whitespace-nowrap px-3 py-1.5 bg-[#1F2025] border border-white/10 text-white/90 text-xs font-medium rounded-lg shadow-xl backdrop-blur-xl`}
          >
             {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
