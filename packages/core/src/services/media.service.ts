/**
 * MediaService handles background tasks for media assets,
 * such as extracting metadata from external URLs (YouTube/Vimeo).
 */
export class MediaService {
  /**
   * Fetches metadata for a given URL.
   * Supports YouTube and Vimeo.
   */
  static async fetchMetadata(url: string) {
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = this.extractYoutubeId(url);
      if (videoId) {
        return {
          provider: 'youtube',
          provider_id: videoId,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          type: 'video' as const,
        };
      }
    }

    if (url.includes('vimeo.com')) {
      const vimeoId = this.extractVimeoId(url);
      if (vimeoId) {
        return {
          provider: 'vimeo',
          provider_id: vimeoId,
          thumbnail: '', // Requires oEmbed API for reliable thumbnails
          embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
          type: 'video' as const,
        };
      }
    }

    return null;
  }

  private static extractYoutubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  private static extractVimeoId(url: string) {
    const match = url.match(/vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
    return match ? match[1] : null;
  }
}
