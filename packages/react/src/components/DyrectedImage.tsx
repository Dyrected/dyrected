import React from 'react';
import type { Media } from '@dyrected/sdk';

export interface DyrectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  media: Media | string;
  width?: number;
  height?: number;
}

export function DyrectedImage({ media, width, height, alt, ...props }: DyrectedImageProps) {
  if (typeof media === 'string') {
    return (
      <img
        src={media}
        width={width ?? 500}
        height={height ?? 500}
        alt={alt ?? ''}
        {...props}
      />
    );
  }

  return (
    <img
      src={media.url}
      width={width ?? media.width ?? 500}
      height={height ?? media.height ?? 500}
      alt={alt ?? media.filename}
      {...props}
    />
  );
}
