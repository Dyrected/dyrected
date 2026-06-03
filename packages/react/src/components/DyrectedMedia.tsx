import React from 'react';
import type { Media } from '@dyrected/sdk';

export interface DyrectedMediaProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  media: Media | string;
  alt?: string;
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
}

const getYouTubeId = (url: string) => {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
};

export function DyrectedMedia({ media, alt, width = 500, height = 500, fallback, ...props }: DyrectedMediaProps) {
  const url = typeof media === 'string' ? media : media.url;
  const mimeType = typeof media === 'string' ? null : media.mimeType;
  const filename = typeof media === 'string' ? '' : media.filename;

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

  if (mimeType?.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
    return (
      <img
        src={url}
        alt={alt ?? filename}
        width={width}
        height={height}
        {...props}
      />
    );
  }

  if (mimeType?.startsWith('video/') || url.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <video src={url} controls width={width} height={height} className="dyrected-media-video" />
    );
  }

  return (
    <div className="dyrected-media-file">
      {fallback ?? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="dyrected-file-link">
          Download {filename || 'File'}
        </a>
      )}
    </div>
  );
}
