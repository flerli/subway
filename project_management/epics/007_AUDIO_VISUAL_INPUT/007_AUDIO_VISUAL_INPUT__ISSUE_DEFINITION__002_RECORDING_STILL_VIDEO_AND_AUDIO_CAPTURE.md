# 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__002_RECORDING_STILL_VIDEO_AND_AUDIO_CAPTURE

## Epic
007 AUDIO VISUAL INPUT

## Issue Title
Recording: Still Images, Video, and Audio Capture

## Issue Description
Extend the audio-visual widget with capture capabilities: button-triggered still image (snapshot), video recording with manual start/stop, and audio-only recording. All three modes shall include real-time audio level visualization via a simple dB meter. Recordings shall be encoded as MP4 (video), MP3 (audio), or JPEG (still) and prepared for server upload with metadata (timestamp, family scope).

## Previous Issue
007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__001_WIDGET_FOUNDATION_AND_LIVE_CAMERA_STREAMING.md

## Developer Team Rules Preamble
- **Before implementing**: Review the completed widget foundation (Issue 001). Understand the camera stream architecture and state management patterns. Review browser APIs: `Canvas.getContext('2d')` for snapshots, `MediaRecorder` API for video/audio, encoder libraries (e.g., FFmpeg.wasm or server-side processing).
- **After implementing**: Document encoder choice, codec trade-offs, and any client-side vs. server-side transcoding decisions in `ISSUE_REPORT__007_AUDIO_VISUAL_INPUT__002.md`. Update `EPIC_OVERVIEW.md` status.

## Functional Requirements

### Still Image Capture (Snapshot)
- Single button "Take Photo" that captures current video frame as JPEG
- Frame is extracted from live camera feed via Canvas API
- Visual feedback: brief flash animation, temporary preview thumbnail
- Prepare image for upload (base64 or blob) without persisting to device

### Video Recording
- Manual start/stop button pair ("Record Video" and "Stop Recording")
- Visual indicator while recording: animated red dot, timestamp counter
- Recording shall capture both audio (microphone) and video (camera) simultaneously
- Encode as H.264 video codec, MP4 container (AAC audio)
- No file size limits, no duration limits
- Graceful handling of recording errors (e.g., disk full, encoder failure)

### Audio-Only Recording
- Separate "Record Audio" button for microphone-only capture
- Encode as MP3 (128 kbps CBR recommended for family-friendly quality)
- Display recording duration counter while active
- Manual stop button to end recording

### Audio Level Visualization
- Real-time audio level meter (simple dB display, e.g., "-12 dB", "-6 dB", "0 dB peak")
- Meter updates at least 10x per second during recording or preview
- Peak hold indicator (shows maximum dB reached for last 2 seconds)
- Visual indicator of clipping (red state if input exceeds threshold)

### Recording State Management
- Display current recording mode (Video, Audio, or None)
- Show elapsed time during active recording (format: MM:SS)
- Prevent mode switching during active recording (disable alternate buttons)
- Auto-save mode preference (user-scoped in app preferences)

### Multilingual Support (Widget-Specific Translations)
Extend `/frontend/src/widgets/audio-visual/translations.ts` with four-language strings:
- "Take Photo" button
- "Record Video" button
- "Stop Recording" button
- "Record Audio" button
- "Recording..." status text
- "Video ready for upload" message
- "Audio recording started" / "Audio recording stopped" notifications
- "Recording error" message
- "Audio Level" label
- "Peak" label
- "Clipping" warning text

## Involved Modules

### Model/State
- `frontend/src/widgets/audio-visual/audioVisualState.ts`: Extend with `recordingMode`, `isRecording`, `recordingStartTime`, `audioLevel`, `peakLevel`, `clippingDetected`, `capturedFile`
- `frontend/src/api/appPreferences.ts`: Add `lastRecordingMode` preference

### View
- `frontend/src/widgets/audio-visual/RecordingControls.tsx`: NEW - buttons for photo/video/audio capture
- `frontend/src/widgets/audio-visual/AudioLevelMeter.tsx`: NEW - real-time dB visualization component
- `frontend/src/widgets/audio-visual/RecordingIndicator.tsx`: NEW - animated recording state display (red dot, timestamp)
- `frontend/src/widgets/audio-visual/AudioVisualWidget.tsx`: Integrate new recording UI components

### Controller
- `frontend/src/widgets/audio-visual/recordingManager.ts`: NEW - encapsulate MediaRecorder, Canvas snapshot, audio processing
- `frontend/src/widgets/audio-visual/audioLevelAnalyzer.ts`: NEW - AnalyserNode wrapper for real-time audio metrics
- `frontend/src/widgets/audio-visual/encodingManager.ts`: NEW - handle JPEG snapshot, MP4 video encoding, MP3 audio encoding (can use client-side or defer to server)

## Implementation Plan

1. **Still Image Capture**:
   - Create `RecordingControls.tsx` with "Take Photo" button
   - Implement canvas-based frame extraction from `<video>` element
   - Convert canvas to JPEG blob with quality 0.9
   - Store in component state for upload preparation
   - Add visual flash feedback (brief opacity animation)

2. **Audio Analysis Setup**:
   - Build `audioLevelAnalyzer.ts` using Web Audio API `AnalyserNode`
   - Connect microphone stream to analyzer for real-time frequency data
   - Compute RMS (root mean square) and convert to dB scale (-60 to 0 dB range)
   - Implement peak hold logic (track max over 2-second window)
   - Implement clipping detection (threshold at -0.5 dB)

3. **Audio Level Meter UI**:
   - Create `AudioLevelMeter.tsx` component
   - Display current dB value, peak hold indicator, clipping warning
   - Use CSS bars or simple text readout
   - Update at 10 Hz from analyzer data via animation frame

4. **Video Recording**:
   - Extend `RecordingControls.tsx` with "Record Video" and "Stop Recording" buttons
   - Use MediaRecorder API with video + audio streams combined
   - Set mime type to `video/mp4` with H.264 codec (or fallback to `video/webm` if MP4 unavailable)
   - Collect `ondataavailable` chunks into buffer
   - On stop, create blob and prepare for upload
   - Add visual recording indicator (red dot animation, elapsed time counter)

5. **Audio-Only Recording**:
   - Add "Record Audio" button to `RecordingControls.tsx`
   - Create separate MediaRecorder for audio-only stream
   - Set mime type to `audio/mpeg` (MP3) if supported, else `audio/wav`
   - If client-side MP3 encoding unavailable, prepare audio/wav for server-side transcode
   - Collect audio chunks, create blob on stop

6. **Recording Indicators**:
   - Build `RecordingIndicator.tsx` showing:
     - Animated red dot when recording
     - Elapsed time MM:SS format
     - Recording mode label (Video / Audio)
   - Show/hide based on `isRecording` state

7. **State & Mode Management**:
   - Track `recordingMode`, `isRecording`, `recordingStartTime` in `audioVisualState.ts`
   - Prevent button switching during active recording (CSS disabled state)
   - Save last used mode to preferences

8. **Four-Language Translations**:
   - Update `/frontend/src/widgets/audio-visual/translations.ts` with all recording-related strings
   - Ensure consistent terminology across languages

9. **Error Handling**:
   - Catch MediaRecorder errors (unsupported codec, permission denied, etc.)
   - Handle encoder failures gracefully with user-facing message
   - Allow retry without full widget reload

## Test Cases

### Still Image Capture Tests
- [ ] "Take Photo" button creates JPEG snapshot from live video
- [ ] Snapshot dimensions match camera stream (or scaled appropriately)
- [ ] Flash animation provides visual feedback
- [ ] Multiple snapshots can be taken in sequence
- [ ] Snapshot is correctly formatted as JPEG (not corrupted)

### Audio Level Meter Tests
- [ ] Audio level meter displays real-time dB values (-60 to 0 dB range)
- [ ] Meter updates at ≥ 10 Hz during recording
- [ ] Peak hold indicator tracks maximum dB over 2-second window
- [ ] Clipping warning appears when input exceeds -0.5 dB threshold
- [ ] Meter responds to microphone input changes (e.g., speaking loudly vs. quietly)

### Video Recording Tests
- [ ] "Record Video" button starts capture, captures both video + audio streams
- [ ] Recording indicator (red dot, timer) displays while recording
- [ ] Elapsed time counter increments correctly (MM:SS format)
- [ ] "Stop Recording" button ends capture and creates MP4 blob
- [ ] Recorded video plays back correctly (no codec issues)
- [ ] Audio track syncs with video track in output file

### Audio-Only Recording Tests
- [ ] "Record Audio" button starts audio-only capture
- [ ] Recording indicator displays for audio mode
- [ ] "Stop Recording" button ends audio capture, creates MP3 blob
- [ ] Recorded audio plays back at correct sample rate and bitrate
- [ ] Audio quality is acceptable (128 kbps MP3)

### State & Mode Management Tests
- [ ] Cannot switch recording modes (photo/video/audio) while recording active
- [ ] Buttons are visually disabled during active recording
- [ ] Recording mode preference persists across widget remount
- [ ] Previous recording is cleared when new recording starts

### Multilingual Tests
- [ ] All recording UI labels display in current language (EN, DE, FR, ES)
- [ ] Recording notifications show localized text
- [ ] Language change updates all recording UI without remount

### Error Handling Tests
- [ ] Encoder failure shows user-friendly error message
- [ ] Permission denied mid-recording terminates gracefully
- [ ] Network interruption (if uploading) does not corrupt local recording
- [ ] Recovery / retry is possible without widget reload

