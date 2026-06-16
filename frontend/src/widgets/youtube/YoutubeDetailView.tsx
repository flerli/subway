import React, { useState, useCallback } from 'react'
import { searchYoutubeVideos, getYoutubeEmbedUrl } from './youtubeApi'
import type { YoutubeWidgetTranslation } from './translations'

interface YoutubeDetailViewProps {
  data: unknown
  languageCode: string
  widgetText: YoutubeWidgetTranslation
}

export const YoutubeDetailView: React.FC<YoutubeDetailViewProps> = ({
  data,
  widgetText,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    (data as any)?.currentVideoId ?? null,
  )
  const [showSearchPanel, setShowSearchPanel] = useState(false)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchYoutubeVideos(query, 50) // Increased limit for browsing
      setSearchResults(results.videos)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchQuery)
  }

  const handleVideoSelect = (videoId: string) => {
    setSelectedVideoId(videoId)
    setShowSearchPanel(false) // Auto-hide search when video selected
  }

  return (
    <div style={styles.container}>
      {/* Video Player - Full Size */}
      <div style={styles.playerWrapper}>
        {selectedVideoId ? (
          <>
            <iframe
              width="100%"
              height="100%"
              src={getYoutubeEmbedUrl(selectedVideoId)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.player}
            />
            <button
              style={styles.toggleButton}
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              title={showSearchPanel ? 'Hide search' : 'Show search'}
            >
              {showSearchPanel ? '▼' : '▶'}
            </button>
          </>
        ) : (
          <div style={styles.emptyPlayer}>
            <div style={styles.emptyIcon}>🔍</div>
            <div style={styles.emptyText}>{widgetText.copy.emptyTitle}</div>
            <div style={styles.emptySubtext}>{widgetText.copy.emptyCopy}</div>
            <button
              style={styles.openSearchBtn}
              onClick={() => setShowSearchPanel(true)}
            >
              Open Search
            </button>
          </div>
        )}
      </div>

      {/* Search & Results Panel - Collapsible */}
      {showSearchPanel && (
        <div style={styles.searchPanel}>
          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <input
              type="text"
              placeholder={widgetText.copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            <button type="submit" style={styles.searchButton} disabled={isSearching}>
              {isSearching ? '⏳' : '🔍'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div style={styles.resultsContainer}>
              <div style={styles.resultsTitle}>
                {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'}
              </div>
              <div style={styles.videoGrid}>
                {searchResults.map((video) => (
                  <div
                    key={video.id}
                    style={styles.videoCard}
                    onClick={() => handleVideoSelect(video.id)}
                    title={video.title}
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      style={styles.thumbnail}
                    />
                    <div style={styles.videoInfo}>
                      <div style={styles.videoTitle}>{video.title}</div>
                      <div style={styles.videoChannel}>{video.channel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div style={styles.noResults}>
              <p>{widgetText.copy.noResults}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    gap: '0',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  playerWrapper: {
    position: 'relative' as const,
    flex: 1,
    backgroundColor: '#000',
    minHeight: '300px',
  },
  player: {
    borderRadius: '0',
    display: 'block',
  },
  emptyPlayer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: '#999',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#ccc',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#888',
  },
  openSearchBtn: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ff0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
  },
  toggleButton: {
    position: 'absolute' as const,
    bottom: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    border: '1px solid #ff0000',
    color: '#ff0000',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  searchPanel: {
    flex: '0 0 auto',
    maxHeight: '50%',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'auto',
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #333',
    backgroundColor: '#222',
    color: '#fff',
    fontSize: '14px',
  },
  searchButton: {
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#ff0000',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '14px',
  },
  resultsContainer: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  resultsTitle: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#aaa',
    padding: '0.75rem 1rem 0.5rem 1rem',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '0.75rem',
    padding: '0.75rem 1rem 1rem 1rem',
    overflow: 'auto',
  },
  videoCard: {
    cursor: 'pointer',
    borderRadius: '4px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    backgroundColor: '#222',
    border: '1px solid #333',
  },
  thumbnail: {
    width: '100%',
    height: '60px',
    objectFit: 'cover' as const,
  },
  videoInfo: {
    padding: '0.5rem',
    fontSize: '11px',
  },
  videoTitle: {
    fontWeight: '500' as const,
    color: '#fff',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
    marginBottom: '0.25rem',
  },
  videoChannel: {
    color: '#999',
    fontSize: '10px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
  noResults: {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '14px',
  },
}
