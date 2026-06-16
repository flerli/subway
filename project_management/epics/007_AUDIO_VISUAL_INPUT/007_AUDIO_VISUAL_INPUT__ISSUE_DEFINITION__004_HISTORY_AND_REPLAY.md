# 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__004_HISTORY_AND_REPLAY

## Epic
007 AUDIO VISUAL INPUT

## Issue Title
History and Replay

## Issue Description
Implement a recording history panel and playback interface where all family members can browse, play back, and delete previously recorded audio, video, and photo content. The history view shall display thumbnails or metadata for each recording, include a simple media player for playback (video and audio), and support image viewing for photos.

## Previous Issue
007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__003_TEMPORARY_SERVER_STORAGE_AND_UPLOAD.md

## Developer Team Rules Preamble
- **Before implementing**: Review Issue 003 backend storage API and frontend `audioVisual.ts` client. Examine existing media player patterns in the codebase (e.g., YouTube widget if present). Understand the extended view framework from Weather widget (002_WEATHER_WIDGET__ISSUE_DEFINITION__003).
- **After implementing**: Document any custom media player implementations and UX decisions (thumbnails vs. metadata-only, pagination, sorting) in `ISSUE_REPORT__007_AUDIO_VISUAL_INPUT__004.md`. Update `EPIC_OVERVIEW.md` status to "implemented".

## Functional Requirements

### History List View
- **List Container**: Scrollable list of all recordings, newest first (reverse chronological)
- **Item Display** (each recording shows):
  - **Thumbnail / Preview**:
    - Video: Extract first frame as thumbnail
    - Audio: Generic audio icon or waveform placeholder
    - Photo: Thumbnail of actual image (cached on server or client-side)
  - **Metadata Row**: Recording type (icon), timestamp (date + time), duration (for video/audio), uploader name, file size
  - **Action Buttons**: Play, View, Download, Delete
- **Pagination**: Load first 20 recordings, "Load More" button for older content (to avoid huge lists)
- **Search/Filter** (optional for Phase 1): Filter by recording type or date range

### Photo Viewing
- Dedicated lightbox or modal view
- Display full-resolution photo (fit to screen)
- Navigation: Previous / Next buttons (if multiple photos)
- Basic controls: Close, Download, Delete buttons
- Should support pinch-zoom on touch devices

### Video Playback
- HTML5 `<video>` element with standard controls (play, pause, progress bar, volume, fullscreen)
- Responsive sizing (max 90% viewport width/height)
- Playback controls layout:
  - Play / pause button
  - Progress bar with time scrubbing
  - Current time / Total duration display
  - Volume control
  - Fullscreen toggle
- Support for common containers: MP4 with H.264 / AAC codecs (browser standard)

### Audio Playback
- HTML5 `<audio>` element with standard controls
- Compact UI (typically shows as horizontal player bar)
- Playback controls: Play / Pause, Progress bar, Current time / Total duration, Volume
- Support MP3 codec

### Playback Modal/Expanded View
- Modal overlay with media player (video or audio) and playback controls
- Close button (X, ESC key support)
- Metadata display: Recording type, timestamp, uploader, file size, duration
- Action buttons: Download, Delete (confirm dialog before deletion)
- Option to show recording as full-screen for video

### Recording Context
- Each playback view shows **who uploaded** the recording (user name)
- Timestamp shows when recording was created (not when uploaded)
- Duration visible for video and audio recordings

### Deletion Workflow
- Delete button in history item or playback view
- Confirm dialog: "Delete this recording? This cannot be undone."
- On confirm: Call DELETE endpoint, remove from local list
- Show success notification or error message

### Multilingual Support (Widget-Specific Translations)
Extend `/frontend/src/widgets/audio-visual/translations.ts` with four-language strings:
- "History" / "Recordings" panel title
- "No recordings yet" (empty state message)
- "Video", "Audio", "Photo" type labels
- "Uploaded by" label
- "Play", "Download", "Delete" button labels
- "Delete Recording?" confirmation title
- "This cannot be undone." confirmation message
- "Cancel", "Confirm" confirmation buttons
- "File Size" label
- "Duration" label
- "Uploaded" label
- "Uploaded at" label
- "No video codec available" error message
- "Failed to load recording" error message

## Involved Modules

### Frontend Model/State
- `frontend/src/widgets/audio-visual/historyState.ts`: NEW - React hook for recordings list, pagination, playback state
- Extend `frontend/src/widgets/audio-visual/audioVisualState.ts` with `selectedRecording`, `playbackMode` fields

### Frontend View Components
- `frontend/src/widgets/audio-visual/RecordingHistory.tsx`: NEW - scrollable list of recordings, pagination
- `frontend/src/widgets/audio-visual/RecordingHistoryItem.tsx`: NEW - individual recording list item with thumbnail/metadata
- `frontend/src/widgets/audio-visual/RecordingPlayer.tsx`: NEW - modal/expanded view for playback
- `frontend/src/widgets/audio-visual/VideoPlayer.tsx`: NEW - wrapper around HTML5 video with custom controls
- `frontend/src/widgets/audio-visual/AudioPlayer.tsx`: NEW - wrapper around HTML5 audio with custom controls
- `frontend/src/widgets/audio-visual/PhotoViewer.tsx`: NEW - lightbox for image viewing
- `frontend/src/widgets/audio-visual/DeleteConfirmDialog.tsx`: NEW - confirmation modal for deletion
- `frontend/src/widgets/audio-visual/AudioVisualWidget.tsx`: Integrate history panel and playback views

### Frontend Controller/Utilities
- `frontend/src/widgets/audio-visual/thumbnailGenerator.ts`: NEW - extract video thumbnails, resize images
- `frontend/src/widgets/audio-visual/mediaPlayer.ts`: NEW - centralized playback state machine (play, pause, seek, error handling)

## Implementation Plan

1. **Recording History State Management**:
   - Create `historyState.ts` React hook with:
     - `recordings`: Array of recording metadata
     - `pageSize`: 20 recordings per page
     - `page`: Current page index
     - `hasMore`: Boolean for "Load More" availability
     - `loading`: Loading state during fetch
     - `selectedRecording`: Currently playing/viewing recording
     - `playbackMode`: 'playing', 'paused', 'stopped'
   - Fetch initial page on mount via `audioVisual.fetchRecordings()`
   - Implement "Load More" pagination handler

2. **History List UI**:
   - Build `RecordingHistory.tsx` container with scrollable list
   - Implement `RecordingHistoryItem.tsx` for each item:
     - Display thumbnail (video first frame or image)
     - Show recording type icon, timestamp, duration, uploader name
     - Action buttons row (Play, Download, Delete)
   - Add "Load More" button at bottom with loading state
   - Show empty state message if no recordings

3. **Thumbnail Generation**:
   - Create `thumbnailGenerator.ts` utility:
     - For video: Extract first frame via canvas or server-side endpoint
     - For images: Resize to thumbnail size (e.g., 160x120) on server or client
     - Cache thumbnails to avoid re-fetching
   - Call during history item render if not cached

4. **Video Player Component**:
   - Build `VideoPlayer.tsx` wrapper around HTML5 `<video>`
   - Implement custom or native controls
   - Handle events: play, pause, ended, error, timeupdate, loadedmetadata
   - Display error message if codec unsupported

5. **Audio Player Component**:
   - Build `AudioPlayer.tsx` wrapper around HTML5 `<audio>`
   - Show standard controls: play/pause, progress, time display, volume
   - Display error message if audio fails to load

6. **Photo Viewer Component**:
   - Build `PhotoViewer.tsx` modal:
     - Display image in lightbox overlay
     - Add prev/next navigation if multiple photos selected
     - Support pinch-zoom on touch devices (via library like `panzoom` or native CSS)
     - Close button (X, ESC key)

7. **Playback Modal**:
   - Create `RecordingPlayer.tsx` modal component:
     - Render appropriate player (video, audio, or photo viewer) based on `selectedRecording.recordingType`
     - Show metadata: type, timestamp, uploader, duration, file size
     - Action buttons: Download (link to backend download endpoint), Delete
   - Modal overlays widget UI, centered on screen

8. **Deletion Workflow**:
   - Create `DeleteConfirmDialog.tsx` confirmation modal
   - On delete button click, show confirmation with warning text
   - On confirm, call `audioVisual.deleteRecording(id)` and refresh list
   - Show success notification (toast or brief message)
   - On error, show error message with retry option

9. **Download Functionality**:
   - Download button triggers fetch from `/api/audio-visual/recordings/:id/download`
   - Use `Blob.createObjectURL()` and trigger browser download
   - Filename: `{recordingType}_{timestamp}.{ext}` (e.g., `video_20260616_143200.mp4`)

10. **History Panel Integration**:
    - Add "History" or "Recordings" button to main widget UI
    - Toggle between live capture mode and history view
    - History should be accessible at all times (not just during recording)

11. **Four-Language Translations**:
    - Update `/frontend/src/widgets/audio-visual/translations.ts` with all history/playback strings
    - Ensure consistent terminology across EN, DE, FR, ES

12. **Error Handling & Edge Cases**:
    - Handle failed playback (codec unsupported, file corrupted, network error)
    - Graceful fallback if thumbnail generation fails
    - Handle empty history (show "No recordings yet" message)
    - Handle deleted recording that still appears in stale list (refresh)

## Test Cases

### History List Tests
- [ ] Initial load shows up to 20 most recent recordings
- [ ] Recordings sorted newest first (reverse chronological)
- [ ] Each item displays thumbnail, type icon, timestamp, duration, uploader
- [ ] "Load More" button appears if >20 recordings exist
- [ ] Clicking "Load More" fetches next 20 recordings
- [ ] Empty state message appears when no recordings exist

### Thumbnail Tests
- [ ] Video thumbnail extracted from first frame (correct dimensions)
- [ ] Image thumbnail resized to display size without distortion
- [ ] Thumbnails cached to prevent re-fetching on page reload
- [ ] Missing/failed thumbnails show placeholder image

### Photo Viewer Tests
- [ ] Clicking photo item opens lightbox modal
- [ ] Photo displays full-resolution, fit to viewport
- [ ] Close button (X) closes modal
- [ ] ESC key closes modal
- [ ] Pinch-zoom works on touch devices (if enabled)
- [ ] Prev/Next navigation works for multiple photos

### Video Playback Tests
- [ ] Clicking video item opens player modal
- [ ] Video plays with standard HTML5 controls
- [ ] Play / Pause buttons function correctly
- [ ] Progress bar shows current playback position
- [ ] Seeking (clicking progress bar) works
- [ ] Time display shows MM:SS format
- [ ] Volume control adjusts audio level
- [ ] Fullscreen button works (if implemented)
- [ ] Video plays to end without errors (for test MP4 file)

### Audio Playback Tests
- [ ] Clicking audio item opens player modal
- [ ] Audio plays with standard controls
- [ ] Play / Pause buttons function
- [ ] Progress bar shows position
- [ ] Seeking works
- [ ] Time display shows MM:SS
- [ ] Volume control works
- [ ] Audio plays to end

### Playback Modal Tests
- [ ] Correct metadata displays (type, timestamp, uploader, duration, size)
- [ ] Download button triggers browser download with correct filename
- [ ] Delete button opens confirmation dialog
- [ ] Close button (X) or outside-click closes modal

### Deletion Workflow Tests
- [ ] Delete button visible on each history item and in playback modal
- [ ] Clicking delete shows confirmation dialog with warning message
- [ ] Confirming deletion calls backend DELETE endpoint
- [ ] Successfully deleted recording removed from history list
- [ ] Delete error shows error message with retry option
- [ ] After deletion, refreshing page no longer shows deleted recording

### Multilingual Tests
- [ ] All history/playback UI displays in current language (EN, DE, FR, ES)
- [ ] History panel title localizes correctly
- [ ] Recording type labels (Video, Audio, Photo) display in local language
- [ ] Button labels and messages localize
- [ ] Language change updates UI without remount or reload

### Error Handling Tests
- [ ] Corrupted MP4 shows error message (no crash)
- [ ] Missing audio codec displays fallback message
- [ ] Network error during fetch shows error with retry
- [ ] Network error during playback stops playback gracefully

### Performance Tests
- [ ] History list scrolls smoothly with 50+ items
- [ ] Thumbnail loading does not block list scrolling
- [ ] Large video file (100+ MB) streams playback without excessive buffering

