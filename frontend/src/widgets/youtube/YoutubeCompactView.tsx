import React from 'react'
import type { YoutubeWidgetTranslation } from './translations'

interface YoutubeCompactViewProps {
  data: unknown
  languageCode: string
  widgetText: YoutubeWidgetTranslation
}

export const YoutubeCompactView: React.FC<YoutubeCompactViewProps> = ({
  data,
  widgetText,
}) => {
  const youtubeData = data as any
  const hasVideo = youtubeData?.currentVideoId
  const videoCount = youtubeData?.videos?.length ?? 0

  return (
    <div style={styles.container}>
      {hasVideo ? (
        <div style={styles.playerPreview}>
          <img
            src={`https://img.youtube.com/vi/${youtubeData.currentVideoId}/mqdefault.jpg`}
            alt="Video thumbnail"
            style={styles.thumbnail}
          />
          <div style={styles.playOverlay}>
            <div style={styles.playButton}>▶</div>
          </div>
          <div style={styles.label}>{widgetText.copy.playingLabel}</div>
        </div>
      ) : (
        <div style={styles.empty}>
          <div style={styles.searchIcon}>🔍</div>
          <div style={styles.emptyText}>{widgetText.copy.emptyTitle}</div>
        </div>
      )}

      {videoCount > 0 && (
        <div style={styles.meta}>
          <span style={styles.metaText}>{videoCount} videos found</span>
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
    gap: '0.5rem',
  },
  playerPreview: {
    position: 'relative' as const,
    flex: 1,
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  playOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    fontSize: '32px',
    color: '#ff0000',
    fontWeight: 'bold' as const,
  },
  label: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: '4px 8px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    color: '#999',
    textAlign: 'center' as const,
  },
  searchIcon: {
    fontSize: '24px',
  },
  emptyText: {
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    fontSize: '11px',
    color: '#aaa',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
  },
  metaText: {
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
}
