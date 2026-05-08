import * as React from "react"
import { cn } from "../../lib/utils"

interface FocalPoint {
  x: number;
  y: number;
}

interface FocalPointPickerProps {
  url: string;
  value?: FocalPoint;
  onChange: (value: FocalPoint) => void;
  className?: string;
}

export function FocalPointPicker({ url, value, onChange, className }: FocalPointPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const focalPoint = value || { x: 50, y: 50 };

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    onChange({ x: clampedX, y: clampedY });
  };

  return (
    <div className="space-y-2">
      <div 
        ref={containerRef}
        className={cn("relative cursor-crosshair overflow-hidden rounded-xl border border-border/40 bg-muted/20 group", className)}
        onClick={handleClick}
      >
        <img 
          src={url} 
          alt="Focal point picker" 
          className="w-full h-auto pointer-events-none select-none max-h-[400px] object-contain bg-checkered" 
        />
        
        {/* Focal point indicator */}
        <div 
          className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-white rounded-full shadow-2xl flex items-center justify-center pointer-events-none transition-all duration-200 ease-out"
          style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
          <div className="absolute w-full h-px bg-white/40" />
          <div className="absolute h-full w-px bg-white/40" />
        </div>
        
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-bold tracking-widest border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          X: {focalPoint.x}% / Y: {focalPoint.y}%
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium px-1">
        Click on the image to set the focal point for smart cropping.
      </p>
    </div>
  );
}
