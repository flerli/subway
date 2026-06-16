import { fetchApi } from '../../api/request'

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
  `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`

/**
 * Build YouTube thumbnail URL
 */
export const getYoutubeThumbnailUrl = (videoId: string): string =>
  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

/**
 * Real YouTube search via backend proxy endpoint
 */
export const searchYoutubeVideos = async (query: string): Promise<YoutubeSearchResult> => {
  const normalizedQuery = query.trim()

  if (normalizedQuery.length === 0) {
    return {
      query: '',
      videos: [],
    }
  }

  const response = await fetchApi(
    `/youtube/search?query=${encodeURIComponent(normalizedQuery)}`,
  )

  if (!response.ok) {
    throw new Error(`YouTube search failed with status ${response.status}`)
  }

  const payload = (await response.json()) as {
    query?: string
    videos?: YoutubeVideo[]
  }

  return {
    query: payload.query ?? normalizedQuery,
    videos: Array.isArray(payload.videos) ? payload.videos : [],
  }
}
