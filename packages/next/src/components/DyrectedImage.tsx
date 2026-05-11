import React from 'react';
import Image, { ImageProps } from 'next/image';
const NextImage = Image as any;
import { Media } from '@dyrected/sdk';

export interface DyrectedImageProps extends Omit<ImageProps, 'src' | 'width' | 'height'> {
  media: Media | string;
  width?: number;
  height?: number;
}

/**
 * A wrapper around next/image that handles Dyrected Media objects.
 */
export function DyrectedImage({ 
  media, 
  width, 
  height, 
  alt,
  ...props 
}: DyrectedImageProps) {
  if (typeof media === 'string') {
    return (
      <NextImage 
        src={media} 
        width={width || 500} 
        height={height || 500} 
        alt={alt || ''} 
        {...props} 
      />
    );
  }

  return (
    <NextImage
      src={media.url}
      width={width || media.width || 500}
      height={height || media.height || 500}
      alt={alt || media.filename}
      {...props}
    />
  );
};
