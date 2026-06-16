# 007 AUDIO VISUAL INPUT — GUI Exploration Guide

## Visual Concept

The Audio-Visual Input widget serves as a family-wide kiosk interface for capturing, recording, and replaying audio-visual content. The widget surfaces camera feed, audio levels, and recording controls in a shared family context.

### Widget Layout (Compact/Default View)
```
┌─────────────────────────────────────┐
│         CAMERA LIVE PREVIEW         │
│     (16:9 aspect ratio stream)      │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ 📷 [PHOTO] 🎥 [VIDEO] 🎙️ [AUDIO]  │
│ 📊 Audio Level: ████████░░░░ -12dB │
├─────────────────────────────────────┤
│  🎥 [●REC] / [■STOP]  [HISTORY]   │
└─────────────────────────────────────┘
```

### Extended View
- Full-screen camera feed with larger controls
- Larger audio visualization
- Recording status display with timestamp
- Quick access to history panel

### History/Playback Panel
```
┌─────────────────────────┐
│  RECORDINGS (Family)    │
├─────────────────────────┤
│ 2026-06-16 14:32        │
│ Video - 45 sec          │
│ [▶️ Play] [🗑️ Delete]  │
│                         │
│ 2026-06-16 13:15        │
│ Photo - Snapshot        │
│ [▶️ View] [🗑️ Delete]  │
│                         │
│ 2026-06-16 13:02        │
│ Audio - 2:14 min        │
│ [▶️ Play] [🗑️ Delete]  │
└─────────────────────────┘
```

### Visual States
- **Camera OFF**: Dimmed preview with "Camera Disabled" overlay
- **Recording**: Pulsing red dot indicator next to REC button
- **Audio Levels**: Real-time meter responding to microphone input
- **Playback**: Standard video player controls (play, pause, progress bar)

