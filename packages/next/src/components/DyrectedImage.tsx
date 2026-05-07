import React from 'react';
import Image, { ImageProps } from 'next/image';
import { Media } from '@dyrected/sdk';

export interface DyrectedImageProps extends Omit<ImageProps, 'src' | 'width' | 'height'> {
  media: Media | string;
  width?: number;
  height?: number;
}

/**
 * A wrapper around next/image that handles Dyrected Media objects.
 */
export const DyrectedImage: React.FC<DyrectedImageProps> = ({ 
  media, 
  width, 
  height, 
  alt,
  ...props 
}) => {
  if (typeof media === 'string') {
    return (
      <Image 
        src={media} 
        width={width || 500} 
        height={height || 500} 
        alt={alt || ''} 
        {...props} 
      />
    );
  }

  return (
    <Image
      src={media.url}
      width={width || media.width || 500}
      height={height || media.height || 500}
      alt={alt || media.filename}
      {...props}
    />
  );
};
