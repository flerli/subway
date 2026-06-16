# 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__001_WIDGET_FOUNDATION_AND_LIVE_CAMERA_STREAMING

## Epic
007 AUDIO VISUAL INPUT

## Issue Title
Widget Foundation and Live Camera Streaming

## Issue Description
Establish the audio-visual widget foundation with live camera feed integration. The widget shall request camera permissions at initialization, stream live video in 16:9 aspect ratio with continuous rendering, provide camera on/off toggle controls, and maintain a visually consistent interface matching the kiosk design system.

## Previous Issue
None (first issue in epic)

## Developer Team Rules Preamble
- **Before implementing**: Read `/frontend/src/widgets/` to understand existing widget structure. Review widget lifecycle patterns in `widgetRegistry.ts`, `WidgetHostModels.tsx`, and the weather widget implementation as a reference.
- **After implementing**: Create an `ISSUE_REPORT__007_AUDIO_VISUAL_INPUT__001.md` documenting concrete implementation choices, permission handling strategy, and any encountered browser API constraints. Update `EPIC_OVERVIEW.md` status to "implemented".

## Functional Requirements

### Camera Initialization & Permission Handling
- Request `getUserMedia()` permission for video stream at widget mount
- Display permission request dialog with clear messaging explaining camera usage
- Gracefully handle permission denial with user-friendly error message and retry option
- Store permission state per-user in application preferences (backend-backed, user-scoped)

### Live Video Streaming
- Render continuous live camera feed in HTML5 `<video>` element
- Maintain 16:9 aspect ratio with responsive sizing
- Support both front-facing and environment-facing cameras on mobile kiosk devices
- Stream frame rate: 30 FPS minimum, adaptive to device capability
- Implement camera fallback (default to front-facing if available)

### Camera Control UI
- **Toggle Button**: On/Off switch to pause and resume live stream
- When OFF: Show dimmed preview with "Camera Disabled" overlay text
- When ON: Show active live feed with visual indicator (e.g., green border or badge)
- Button state shall be independent per user session (preference-backed)

### Performance & Resource Management
- Clean up media streams on widget unmount to prevent memory leaks
- Stop camera feed when widget is minimized or hidden
- Handle camera disconnection gracefully (e.g., physical USB disconnection, permission revocation)

### Multilingual Support (Widget-Specific Translations)
Create `/frontend/src/widgets/audio-visual/translations.ts` with four-language translations for:
- "Camera Disabled" overlay text
- "Enable Camera" button label
- "Disable Camera" button label
- "Camera Permission Denied" error message
- "Retry Permission" button label
- "Camera Unavailable" error message
- Widget title: "Audio Visual"

## Involved Modules

### Model/State
- `frontend/src/widgets/audio-visual/audioVisualState.ts`: React state hook for camera stream, permission status, device list
- `frontend/src/api/appPreferences.ts`: Extend to store camera permission preference and camera-on/off toggle state

### View
- `frontend/src/widgets/audio-visual/AudioVisualWidget.tsx`: Main widget component, live video element
- `frontend/src/widgets/audio-visual/CameraControls.tsx`: Camera on/off toggle, settings
- `frontend/src/widgets/audio-visual/PermissionDialog.tsx`: Permission request UI with messaging

### Controller
- `frontend/src/widgets/audio-visual/cameraManager.ts`: Wrapper around `getUserMedia()` API, stream lifecycle management, error handling
- `frontend/src/widgets/audio-visual/translations.ts`: Four-language strings (EN, DE, FR, ES)

## Implementation Plan

1. **Create widget folder structure**:
   - `/frontend/src/widgets/audio-visual/` with standard subfolder layout
   - Include `index.ts` for widget registration entry point

2. **Implement camera permission flow**:
   - Create `PermissionDialog.tsx` component for initial permission request with explanation
   - Store permission result in app preferences via existing preference API
   - Implement permission state machine (requested → granted/denied → resolved)

3. **Implement live video streaming**:
   - Build `cameraManager.ts` with `requestUserMedia()`, `startStream()`, `stopStream()` methods
   - Handle promise rejection gracefully (permission denied, device unavailable, etc.)
   - Implement automatic restart on permission change or device reconnection

4. **Build main widget UI**:
   - Compose `AudioVisualWidget.tsx` with live `<video>` element in 16:9 container
   - Integrate `CameraControls.tsx` for on/off toggle
   - Style according to existing kiosk design tokens (borders, spacing, dark mode support)

5. **Create four-language translation file**:
   - Build `/frontend/src/widgets/audio-visual/translations.ts` with shared schema (EN, DE, FR, ES entries)
   - Cover all camera-specific UI copy identified in Multilingual Support section

6. **Implement state persistence**:
   - Store camera-on/off preference via `appPreferences` API (user-scoped)
   - Restore camera state on widget remount based on stored preference
   - Handle case where permission was revoked between sessions

7. **Resource cleanup**:
   - Implement proper media stream teardown in React `useEffect` cleanup
   - Stop camera when widget unmounts, hides, or user toggles OFF
   - Prevent multiple simultaneous stream requests

8. **Error handling & edge cases**:
   - Handle "Permission revoked" after initial grant
   - Handle camera disconnected during streaming
   - Display appropriate UI for each error scenario (refer to PermissionDialog and error overlay)
   - Retry mechanism with exponential backoff for transient failures

## Test Cases

### Permission Flow Tests
- [ ] First-time user sees permission dialog with clear explanation
- [ ] User grants permission → camera stream starts
- [ ] User denies permission → error message displays, retry available
- [ ] User revokes permission in system settings → widget detects and updates UI
- [ ] Permission preference persists across widget remount

### Live Streaming Tests
- [ ] Camera feed renders at 16:9 aspect ratio (mobile and desktop viewports)
- [ ] Live video updates at ≥ 30 FPS on target kiosk hardware
- [ ] Video element respects responsive container width/height
- [ ] Front-facing and environment-facing cameras both selectable (if multi-camera device)

### Camera Control Tests
- [ ] Camera ON/OFF toggle works correctly
- [ ] OFF state shows dimmed preview with "Camera Disabled" overlay
- [ ] ON state shows active feed with visual indicator
- [ ] Toggle state persists across widget hide/show
- [ ] Camera stream properly cleaned up when widget unmounts

### Resource Management Tests
- [ ] No memory leaks when toggling camera on/off repeatedly (10+ cycles)
- [ ] Media stream stops when widget is hidden
- [ ] Camera stops when user logs out / widget disposed
- [ ] Multiple camera start requests do not create duplicate streams

### Multilingual Tests
- [ ] Widget-owned translations render correctly in all four languages (EN, DE, FR, ES)
- [ ] Permission dialog shows localized text matching global language setting
- [ ] Error messages display in currently selected language
- [ ] Changing global language updates all widget-local text without remount

### Edge Cases
- [ ] USB camera physically disconnected during streaming → graceful error handling
- [ ] Device with no camera → appropriate "Not Available" message
- [ ] Browser denies camera permission (privacy settings) → informative message
- [ ] Widget opened in multiple browser tabs → only one active stream per device

