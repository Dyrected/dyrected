import React from 'react';
import Image, { ImageProps } from 'next/image';
const NextImage = Image as any;
import { Media } from '@dyrected/sdk';

export interface DyrectedMediaProps extends Partial<Omit<ImageProps, 'src' | 'alt'>> {
  media: Media | string;
  alt?: string;
  /**
   * Fallback icon/component for non-visual media (PDFs, etc.)
   */
  fallback?: React.ReactNode;
}

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export function DyrectedMedia({ 
  media, 
  alt, 
  width = 500, 
  height = 500,
  fallback,
  ...props 
}: DyrectedMediaProps) {
  const url = typeof media === 'string' ? media : media.url;
  const mimeType = typeof media === 'string' ? null : media.mimeType;
  const type = typeof media === 'string' ? 'external' : (media.type || 'upload');

  // 1. Check for YouTube
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return (
      <div className="dyrected-media-video" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  // 2. Check for Images
  if (mimeType?.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
    return (
      <NextImage
        src={url}
        alt={alt || (typeof media !== 'string' ? media.filename : '')}
        width={Number(width)}
        height={Number(height)}
        {...props}
      />
    );
  }

  // 3. Check for Video uploads
  if (mimeType?.startsWith('video/') || url.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <video
        src={url}
        controls
        width={width}
        height={height}
        className="dyrected-media-video"
      />
    );
  }

  // 4. Fallback for Documents (PDF, ZIP, etc.)
  return (
    <div className="dyrected-media-file">
      {fallback || (
        <a href={url} target="_blank" rel="noopener noreferrer" className="dyrected-file-link">
          Download {typeof media !== 'string' ? media.filename : 'File'}
        </a>
      )}
    </div>
  );
};
