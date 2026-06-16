import React from 'react'
import type { YoutubeVideo } from './youtubeApi'
import type { YoutubeWidgetTranslation } from './translations'

interface YoutubeCompactViewProps {
  query: string
  selectedVideoId: string | null
  selectedVideoTitle: string
  searchPanelOpen: boolean
  isSearching: boolean
  canSelectPrevious: boolean
  canSelectNext: boolean
  onQueryChange: (value: string) => void
  onSearch: () => void
  onToggleSearchPanel: () => void
  onSelectPrevious: () => void
  onSelectNext: () => void
  onToggleFullscreen: () => void
  searchResults: YoutubeVideo[]
  widgetText: YoutubeWidgetTranslation
}

export const YoutubeCompactView: React.FC<YoutubeCompactViewProps> = ({
  query,
  selectedVideoId,
  selectedVideoTitle,
  searchPanelOpen,
  isSearching,
  canSelectPrevious,
  canSelectNext,
  onQueryChange,
  onSearch,
  onToggleSearchPanel,
  onSelectPrevious,
  onSelectNext,
  onToggleFullscreen,
  searchResults,
  widgetText,
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSearch()
  }

  return (
    <div style={styles.container}>
      <form style={styles.searchRow} onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          placeholder={widgetText.copy.searchPlaceholder}
          onChange={(event) => onQueryChange(event.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.actionButton} disabled={isSearching}>
          {isSearching ? '...' : 'Go'}
        </button>
      </form>

      <div style={styles.controlRow}>
        <button
          type="button"
          style={styles.iconButton}
          onClick={onToggleSearchPanel}
          title={searchPanelOpen ? 'Hide search panel' : 'Show search panel'}
        >
          ⌕
        </button>
        <button
          type="button"
          style={styles.iconButton}
          onClick={onSelectPrevious}
          disabled={!canSelectPrevious}
          title="Previous result"
        >
          ◀
        </button>
        <button
          type="button"
          style={styles.iconButton}
          onClick={onSelectNext}
          disabled={!canSelectNext}
          title="Next result"
        >
          ▶
        </button>
        <button
          type="button"
          style={styles.iconButton}
          onClick={onToggleFullscreen}
          title="Toggle fullscreen"
        >
          ⛶
        </button>
      </div>

      <div style={styles.meta}>
        <span style={styles.metaText}>
          {selectedVideoId
            ? `${widgetText.copy.playingLabel}: ${selectedVideoTitle}`
            : widgetText.copy.emptyTitle}
        </span>
        <span style={styles.metaCount}>{searchResults.length}</span>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    gap: '0.5rem',
    justifyContent: 'space-between',
  },
  searchRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    backgroundColor: 'rgba(5, 11, 23, 0.8)',
    color: '#e5e7eb',
    padding: '0.4rem 0.5rem',
    fontSize: '12px',
  },
  actionButton: {
    border: '1px solid rgba(255, 255, 255, 0.22)',
    borderRadius: '6px',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontSize: '12px',
    padding: '0.4rem 0.55rem',
    cursor: 'pointer',
  },
  controlRow: {
    display: 'flex',
    gap: '0.35rem',
  },
  iconButton: {
    flex: 1,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    color: '#e2e8f0',
    fontSize: '12px',
    padding: '0.35rem 0.2rem',
    cursor: 'pointer',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.4rem',
    padding: '0.4rem 0.5rem',
    fontSize: '10px',
    color: '#93c5fd',
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
    borderRadius: '6px',
  },
  metaText: {
    flex: 1,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
  metaCount: {
    color: '#cbd5e1',
    fontVariantNumeric: 'tabular-nums' as const,
  },
}
