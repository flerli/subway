import React from 'react'
import { getYoutubeEmbedUrl, type YoutubeVideo } from './youtubeApi'
import type { YoutubeWidgetTranslation } from './translations'

export interface YoutubeDetailData {
  query: string
  results: YoutubeVideo[]
  selectedVideoId: string | null
  searchPanelOpen: boolean
  isSearching: boolean
  isFullscreen: boolean
  canSelectPrevious: boolean
  canSelectNext: boolean
  onQueryChange: (value: string) => void
  onSearch: () => void
  onToggleSearchPanel: () => void
  onSelectVideo: (videoId: string) => void
  onSelectPrevious: () => void
  onSelectNext: () => void
  onToggleFullscreen: () => void
}

interface YoutubeDetailViewProps {
  data: YoutubeDetailData
  languageCode: string
  widgetText: YoutubeWidgetTranslation
}

export const YoutubeDetailView: React.FC<YoutubeDetailViewProps> = ({
  data,
  widgetText,
}) => {
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    data.onSearch()
  }

  return (
    <div style={styles.container}>
      <div style={styles.playerWrapper}>
        {data.selectedVideoId ? (
          <>
            <iframe
              width="100%"
              height="100%"
              src={getYoutubeEmbedUrl(data.selectedVideoId)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.player}
            />
            <div style={styles.overlayControls}>
              <button
                type="button"
                style={styles.toggleButton}
                onClick={data.onToggleSearchPanel}
                title={data.searchPanelOpen ? 'Hide search panel' : 'Show search panel'}
              >
                ⌕
              </button>
              <button
                type="button"
                style={styles.toggleButton}
                onClick={data.onSelectPrevious}
                disabled={!data.canSelectPrevious}
                title="Previous result"
              >
                ◀
              </button>
              <button
                type="button"
                style={styles.toggleButton}
                onClick={data.onSelectNext}
                disabled={!data.canSelectNext}
                title="Next result"
              >
                ▶
              </button>
              <button
                type="button"
                style={styles.toggleButton}
                onClick={data.onToggleFullscreen}
                title={data.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {data.isFullscreen ? '⤢' : '⛶'}
              </button>
            </div>
          </>
        ) : (
          <div style={styles.emptyPlayer}>
            <div style={styles.emptyIcon}>🔍</div>
            <div style={styles.emptyText}>{widgetText.copy.emptyTitle}</div>
            <div style={styles.emptySubtext}>{widgetText.copy.emptyCopy}</div>
            <button
              type="button"
              style={styles.openSearchButton}
              onClick={data.onToggleSearchPanel}
            >
              Open Search
            </button>
          </div>
        )}
      </div>

      {data.searchPanelOpen ? (
        <div style={styles.searchPanel}>
          <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
            <input
              type="text"
              placeholder={widgetText.copy.searchPlaceholder}
              value={data.query}
              onChange={(event) => data.onQueryChange(event.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            <button type="submit" style={styles.searchButton} disabled={data.isSearching}>
              {data.isSearching ? '⏳' : '🔍'}
            </button>
          </form>

          {data.results.length > 0 ? (
            <div style={styles.resultsWrap}>
              <div style={styles.resultsTitle}>{data.results.length} Results</div>
              <div style={styles.videoGrid}>
                {data.results.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    style={styles.videoCard}
                    onClick={() => data.onSelectVideo(video.id)}
                    title={video.title}
                  >
                    <img src={video.thumbnail} alt={video.title} style={styles.thumbnail} />
                    <div style={styles.videoInfo}>
                      <div style={styles.videoTitle}>{video.title}</div>
                      <div style={styles.videoChannel}>{video.channel}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {data.results.length === 0 && data.query && !data.isSearching ? (
            <div style={styles.noResults}>{widgetText.copy.noResults}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#020617',
    overflow: 'hidden',
  },
  playerWrapper: {
    position: 'relative' as const,
    flex: 1,
    minHeight: '280px',
    backgroundColor: '#000',
  },
  player: {
    border: 'none',
    display: 'block',
  },
  overlayControls: {
    position: 'absolute' as const,
    right: '0.9rem',
    bottom: '0.9rem',
    display: 'flex',
    gap: '0.35rem',
  },
  toggleButton: {
    width: '36px',
    height: '36px',
    borderRadius: '999px',
    border: '1px solid rgba(239, 68, 68, 0.8)',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    color: '#f8fafc',
    fontSize: '14px',
    cursor: 'pointer',
  },
  emptyPlayer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    gap: '0.6rem',
  },
  emptyIcon: {
    fontSize: '2rem',
  },
  emptyText: {
    fontWeight: 600,
  },
  emptySubtext: {
    fontSize: '12px',
  },
  openSearchButton: {
    border: '1px solid rgba(239, 68, 68, 0.8)',
    borderRadius: '6px',
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    color: '#fca5a5',
    padding: '0.45rem 0.7rem',
    cursor: 'pointer',
  },
  searchPanel: {
    maxHeight: '52%',
    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.8rem',
  },
  searchInput: {
    flex: 1,
    border: '1px solid rgba(148, 163, 184, 0.25)',
    borderRadius: '6px',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: '0.55rem 0.65rem',
    fontSize: '13px',
  },
  searchButton: {
    border: '1px solid rgba(239, 68, 68, 0.9)',
    borderRadius: '6px',
    backgroundColor: '#991b1b',
    color: '#fee2e2',
    fontWeight: 600,
    minWidth: '42px',
    cursor: 'pointer',
  },
  resultsWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
  },
  resultsTitle: {
    fontSize: '11px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: '#94a3b8',
    padding: '0 0.9rem 0.45rem 0.9rem',
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.65rem',
    padding: '0 0.9rem 0.9rem 0.9rem',
    overflow: 'auto',
  },
  videoCard: {
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    backgroundColor: '#111827',
    color: '#e5e7eb',
    textAlign: 'left' as const,
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  thumbnail: {
    width: '100%',
    height: '78px',
    objectFit: 'cover' as const,
    display: 'block',
  },
  videoInfo: {
    padding: '0.45rem 0.5rem 0.55rem 0.5rem',
  },
  videoTitle: {
    fontSize: '11px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
  videoChannel: {
    marginTop: '0.2rem',
    fontSize: '10px',
    color: '#9ca3af',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
  noResults: {
    padding: '0.8rem 0.9rem 1rem 0.9rem',
    color: '#94a3b8',
    fontSize: '12px',
  },
}
