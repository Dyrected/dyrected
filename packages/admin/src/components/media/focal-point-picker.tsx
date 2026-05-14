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
    <div className="dy-space-y-2">
      <div 
        ref={containerRef}
        className={cn("dy-relative dy-cursor-crosshair dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/40 dy-bg-muted/20 dy-group", className)}
        onClick={handleClick}
      >
        <img 
          src={url} 
          alt="Focal point picker" 
          className="dy-w-full dy-h-auto dy-pointer-events-none dy-select-none dy-max-h-[400px] dy-object-contain dy-bg-checkered" 
        />
        
        {/* Focal point indicator */}
        <div 
          className="dy-absolute dy-w-8 dy-h-8 dy--ml-4 dy--mt-4 dy-border-2 dy-border-white dy-rounded-full dy-shadow-2xl dy-flex dy-items-center dy-justify-center dy-pointer-events-none dy-transition-all dy-duration-200 dy-ease-out"
          style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
        >
          <div className="dy-w-1.5 dy-h-1.5 dy-bg-white dy-rounded-full dy-shadow-sm" />
          <div className="dy-absolute dy-w-full dy-h-px dy-bg-white/40" />
          <div className="dy-absolute dy-h-full dy-w-px dy-bg-white/40" />
        </div>
        
        <div className="dy-absolute dy-bottom-3 dy-left-3 dy-bg-black/60 dy-backdrop-blur-md dy-px-2.5 dy-py-1 dy-rounded-lg dy-text-[10px] dy-text-white dy-font-bold dy-tracking-widest dy-border dy-border-white/10 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
          X: {focalPoint.x}% / Y: {focalPoint.y}%
        </div>
      </div>
      <p className="dy-text-[10px] dy-text-muted-foreground dy-font-medium dy-px-1">
        Click on the image to set the focal point for smart cropping.
      </p>
    </div>
  );
}
