# 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__003_TEMPORARY_SERVER_STORAGE_AND_UPLOAD

## Epic
007 AUDIO VISUAL INPUT

## Issue Title
Temporary Server Storage and Upload

## Issue Description
Implement backend storage for family-wide audio-visual recordings with multipart upload API, persistent recording metadata, and lifecycle management. Recordings shall be uploaded from the browser to the backend via `/api/audio-visual/recordings` endpoint, stored with user ownership context, and made available to all family members for retrieval and deletion.

## Previous Issue
007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__002_RECORDING_STILL_VIDEO_AND_AUDIO_CAPTURE.md

## Developer Team Rules Preamble
- **Before implementing**: Review existing backend patterns in `backend/server.mjs`, user-scoped route middleware, and data model conventions. Understand the family-member scope model from Calendar widget. Review multipart form-data handling in Express or chosen backend framework.
- **After implementing**: Document storage path conventions, cleanup strategy, and any disk space monitoring considerations in `ISSUE_REPORT__007_AUDIO_VISUAL_INPUT__003.md`. Verify upload works with large files (100+ MB video). Update `EPIC_OVERVIEW.md` status.

## Functional Requirements

### Backend Recording Metadata Schema
- **recordings** database entity with fields:
  - `id`: Unique identifier (UUID)
  - `userId`: User who initiated recording (foreign key to users)
  - `recordingType`: One of ["photo", "video", "audio"]
  - `mimeType`: "image/jpeg", "video/mp4", or "audio/mp3"
  - `fileSize`: Bytes uploaded
  - `duration`: Seconds (for video/audio only, null for photo)
  - `storagePath`: Local file path on server
  - `uploadedAt`: ISO 8601 timestamp
  - `deletedAt`: Soft-delete flag (null = active, timestamp = deleted)

### Upload Endpoint: POST `/api/audio-visual/recordings`
- Accept multipart form-data with file blob and metadata
- Require authentication (user session)
- Validate file MIME type (must match claimed type)
- Limit upload size: 500 MB per request (configurable)
- Return response: `{ id, uploadedAt, fileSize, recordingType }`
- On error (too large, invalid type, server full): Return 400/413/507 with descriptive message

### Retrieval Endpoint: GET `/api/audio-visual/recordings?type=photo|video|audio|all`
- Return JSON array of recordings accessible to authenticated user
- Include metadata: `id`, `recordingType`, `mimeType`, `fileSize`, `duration`, `uploadedAt`, `uploadedBy` (uploading user name)
- Filter by optional `type` query parameter (default: all types)
- Sort by `uploadedAt` descending (newest first)
- Exclude soft-deleted recordings
- Include all recordings visible to family (all family members see all recordings)

### Download Endpoint: GET `/api/audio-visual/recordings/:id/download`
- Stream recorded file back to browser
- Verify authentication and family-member access
- Set `Content-Disposition: attachment; filename=...` header
- Set correct `Content-Type` header based on stored MIME type
- Return 404 if recording deleted or not found

### Deletion Endpoint: DELETE `/api/audio-visual/recordings/:id`
- Soft-delete the recording (set `deletedAt` timestamp)
- Verify authentication: only creator or admin can delete
- Return success response: `{ id, deletedAt }`
- Actual file cleanup performed by background job (see lifecycle section)

### File Storage
- Store uploaded files in dedicated directory: `backend/storage/audio-visual/` (date-based subdirectories optional: `YYYY/MM/DD/`)
- Filename format: `{uuid}.{ext}` (e.g., `550e8400-e29b-41d4-a716-446655440000.mp4`)
- Ensure directory permissions prevent direct web access (via `.htaccess` or server config)

### Recording Lifecycle & Cleanup (Background Job)
- Implement scheduled cleanup task (daily, at off-peak hours)
- Hard-delete files where `deletedAt` timestamp is older than 7 days (or configurable retention)
- Log cleanup actions for audit trail

### Family-Wide Visibility
- All authenticated family members see all recordings (shared scope)
- Each recording displays uploader user name for context
- No per-recording access controls (family shares all content)

### Error Handling & Resilience
- Handle upload interruption (partial file): Reject and clean up incomplete upload
- Handle storage full condition: Return 507 Insufficient Storage
- Handle concurrent uploads: Use file locking or atomic writes to prevent corruption
- Log all upload/download/deletion events for debugging

## Involved Modules

### Backend Model
- `backend/models/Recording.js` or equivalent: Define schema, validation, database migrations
- Schema properties: id, userId, recordingType, mimeType, fileSize, duration, storagePath, uploadedAt, deletedAt

### Backend Routes/Controller
- `backend/routes/audioVisual.js`: NEW route handler
  - POST `/api/audio-visual/recordings` - upload handler
  - GET `/api/audio-visual/recordings` - list handler
  - GET `/api/audio-visual/recordings/:id/download` - download handler
  - DELETE `/api/audio-visual/recordings/:id` - soft-delete handler
- Include authentication middleware on all routes
- Include family-member scope validation

### Backend Utilities
- `backend/utils/fileStorage.js`: NEW - manage recording file paths, cleanup
- `backend/utils/uploadMiddleware.js`: NEW - multipart handling, size limits, MIME validation
- `backend/jobs/cleanupDeletedRecordings.js`: NEW - scheduled cleanup task

### Frontend API
- `frontend/src/api/audioVisual.ts`: NEW API client
  - `uploadRecording(blob, type, duration)`: POST to upload endpoint
  - `fetchRecordings(type)`: GET to list endpoint
  - `downloadRecording(id)`: GET download endpoint
  - `deleteRecording(id)`: DELETE endpoint

### Frontend UI
- `frontend/src/widgets/audio-visual/RecordingUploadManager.tsx`: NEW - handle upload state, progress, error feedback
- `frontend/src/widgets/audio-visual/AudioVisualWidget.tsx`: Integrate upload flow post-recording

## Implementation Plan

1. **Database Schema**:
   - Create migration to add `recordings` table with all required fields
   - Add indexes on userId, deletedAt, uploadedAt for query performance
   - Add foreign key constraint on userId (cascade delete if user deleted)

2. **Backend Route Handlers**:
   - Create `backend/routes/audioVisual.js` with multipart middleware (use `multer` or similar)
   - Implement POST `/api/audio-visual/recordings` with file validation, size check, storage path generation
   - Implement GET `/api/audio-visual/recordings` with metadata query, sorting, filtering
   - Implement GET `/api/audio-visual/recordings/:id/download` with streaming and headers
   - Implement DELETE `/api/audio-visual/recordings/:id` with soft-delete logic

3. **File Storage Manager**:
   - Build `backend/utils/fileStorage.js` with:
     - `generateStoragePath(recordingType)`: Create date-based or UUID-based path
     - `saveFile(stream, path)`: Write uploaded file to disk
     - `deleteFile(path)`: Remove file from disk
     - `ensureStorageDirectory()`: Create `backend/storage/audio-visual/` if missing

4. **Upload Validation**:
   - Create `backend/utils/uploadMiddleware.js` with:
     - MIME type whitelist: image/jpeg, video/mp4, audio/mp3
     - File size limit: 500 MB per upload
     - Virus scanning hook (optional, defer if not available)
     - Multipart field naming convention

5. **Authentication & Scope Enforcement**:
   - Add route middleware to verify user authentication
   - Ensure GET list endpoint returns all family recordings (no per-user filter for retrieval)
   - Ensure DELETE endpoint allows creator or admin only

6. **Background Cleanup Job**:
   - Create `backend/jobs/cleanupDeletedRecordings.js` with daily scheduler
   - Hard-delete files where `deletedAt` > 7 days old
   - Log cleanup summary (count deleted, bytes freed)

7. **Frontend Upload API Client**:
   - Build `frontend/src/api/audioVisual.ts` with:
     - `uploadRecording(blob, type, duration)`: POST multipart form-data, return response metadata
     - `fetchRecordings(type)`: GET with optional filter, return array
     - `downloadRecording(id)`: Fetch blob, trigger browser download
     - `deleteRecording(id)`: DELETE endpoint

8. **Frontend Upload UI Manager**:
   - Create `RecordingUploadManager.tsx` component to handle:
     - Upload state transitions (idle → uploading → success/error)
     - Progress bar (show uploaded bytes / total bytes)
     - Error display with retry option
     - Success notification

9. **Integration**:
   - Wire upload flow into `AudioVisualWidget.tsx`: After photo/video/audio capture, immediately trigger upload
   - Store upload result (id) for replay history reference

## Test Cases

### Upload Endpoint Tests
- [ ] Valid JPEG photo upload succeeds, returns id and metadata
- [ ] Valid MP4 video upload succeeds, stores file, returns metadata with duration
- [ ] Valid MP3 audio upload succeeds, returns metadata
- [ ] Invalid MIME type rejected (400 Bad Request)
- [ ] File exceeding 500 MB rejected (413 Payload Too Large)
- [ ] Unauthenticated request rejected (401 Unauthorized)
- [ ] Multipart parsing handles interrupted upload gracefully

### List Endpoint Tests
- [ ] GET `/api/audio-visual/recordings` returns all recordings for authenticated user
- [ ] All family members see same recording list (shared scope)
- [ ] Filter by `?type=video` returns only video recordings
- [ ] Filter by `?type=audio` returns only audio recordings
- [ ] Filter by `?type=photo` returns only photo recordings
- [ ] Recordings sorted by `uploadedAt` descending (newest first)
- [ ] Soft-deleted recordings not returned (where `deletedAt` is set)
- [ ] Empty list returns `[]` not error

### Download Endpoint Tests
- [ ] Valid request streams file with correct Content-Type header
- [ ] File downloads with proper filename (Content-Disposition header)
- [ ] Large file (100+ MB) downloads completely without corruption
- [ ] Invalid recording id returns 404
- [ ] Deleted recording returns 404
- [ ] Unauthenticated request rejected (401)

### Delete Endpoint Tests
- [ ] Recording creator can soft-delete their own recording
- [ ] Deleted recording marked with `deletedAt` timestamp
- [ ] Deleted recording no longer appears in list
- [ ] Hard delete only happens via background job (7+ days)
- [ ] File still exists on disk after soft delete (until cleanup job)

### File Storage Tests
- [ ] Files stored in `backend/storage/audio-visual/` directory
- [ ] Filename format is UUIDs with correct extension (.mp4, .mp3, .jpg)
- [ ] File permissions prevent web server from serving files directly
- [ ] Multiple concurrent uploads don't corrupt each other

### Cleanup Job Tests
- [ ] Scheduled job runs daily (configurable)
- [ ] Hard-deletes files where `deletedAt` > 7 days old
- [ ] Cleanup log records number of files deleted, bytes freed
- [ ] Recent soft-deletes are NOT hard-deleted (retention period respected)

### Frontend Upload Flow Tests
- [ ] After photo capture, blob uploaded automatically
- [ ] After video recording stops, file uploaded automatically
- [ ] After audio recording stops, file uploaded automatically
- [ ] Upload progress visible in UI (progress bar)
- [ ] Upload error shows retry option
- [ ] Successful upload triggers notification / confirmation

