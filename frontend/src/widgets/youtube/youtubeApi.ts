export interface YoutubeVideo {
  id: string
  title: string
  thumbnail: string
  channel: string
  duration?: string
}

export interface YoutubeSearchResult {
  videos: YoutubeVideo[]
  query: string
}

/**
 * Parse YouTube URL to get video ID
 */
export const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

/**
 * Build YouTube embedded player URL
 */
export const getYoutubeEmbedUrl = (videoId: string): string =>
  `https://www.youtube.com/embed/${videoId}?enablejsapi=1`

/**
 * Build YouTube thumbnail URL
 */
export const getYoutubeThumbnailUrl = (videoId: string): string =>
  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

/**
 * Mock YouTube search - in production would call a backend API
 * that uses YouTube Data API v3 with an API key
 */
export const searchYoutubeVideos = async (
  query: string,
  maxResults: number = 50,
): Promise<YoutubeSearchResult> => {
  // Mock search results with realistic video data structure
  const mockVideos: YoutubeVideo[] = [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      channel: 'Rick Astley',
      thumbnail: getYoutubeThumbnailUrl('dQw4w9WgXcQ'),
    },
    {
      id: 'jNQXAC9IVRw',
      title: 'Me at the zoo',
      channel: 'jawed',
      thumbnail: getYoutubeThumbnailUrl('jNQXAC9IVRw'),
    },
    {
      id: 'kJQP7kiw9l0',
      title: 'Luis Fonsi - Despacito',
      channel: 'Luis Fonsi',
      thumbnail: getYoutubeThumbnailUrl('kJQP7kiw9l0'),
    },
    {
      id: 'Xy7XGMWVF-4',
      title: `"${query}" - Music Video 1`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('Xy7XGMWVF-4'),
    },
    {
      id: 'hHW1oY26kxQ',
      title: `"${query}" - Music Video 2`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('hHW1oY26kxQ'),
    },
    {
      id: '4Yd0QAd4Ggw',
      title: `"${query}" - Music Video 3`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('4Yd0QAd4Ggw'),
    },
    {
      id: 'wQEy7pVDFi0',
      title: `"${query}" - Music Video 4`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('wQEy7pVDFi0'),
    },
    {
      id: 'F54GWnJCIao',
      title: `"${query}" - Music Video 5`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('F54GWnJCIao'),
    },
    {
      id: 'I5wqJIBGwRM',
      title: `"${query}" - Music Video 6`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('I5wqJIBGwRM'),
    },
    {
      id: 'h_D3VFfhvs4',
      title: `"${query}" - Music Video 7`,
      channel: 'Artist Channel',
      thumbnail: getYoutubeThumbnailUrl('h_D3VFfhvs4'),
    },
  ]

  return {
    videos: mockVideos.slice(0, maxResults),
    query,
  }
}

/**
 * Get video details
 */
export const getYoutubeVideoDetails = async (videoId: string): Promise<YoutubeVideo> => {
  return {
    id: videoId,
    title: 'Video Title',
    channel: 'Channel Name',
    thumbnail: getYoutubeThumbnailUrl(videoId),
  }
}
