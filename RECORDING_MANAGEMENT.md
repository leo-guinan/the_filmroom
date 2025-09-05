# Session Recording Management System

## Overview
The Film Room now includes a comprehensive session recording management system that allows coaches to:
- View all their coaching sessions and recording status
- Upload recordings from external platforms (Zoom, Teams, Google Meet, etc.)
- Automatically sync recordings with AWS S3
- Track transcript and analysis status
- Manage recordings with full CRUD operations

## Features

### Database Schema
- **Enhanced Session Model**: Added fields for external recordings, S3 uploads, transcripts, and analysis
- **SessionUpload Model**: Tracks all upload history with status and metadata
- **Support for Multiple Participants**: Sessions can now track multiple client participants

### Backend API Endpoints

#### `/api/v1/recordings/sessions`
- **GET**: Retrieve all sessions for a coach with recording status
- Query parameters:
  - `include_transcript`: Include transcript data
  - `include_analysis`: Include analysis data

#### `/api/v1/recordings/upload`
- **POST**: Upload a recording for a session
- Supports:
  - Direct file upload
  - External URL download (background processing)
  - Platform specification (Zoom, Teams, etc.)

#### `/api/v1/recordings/presigned-upload-url`
- **GET**: Generate presigned URL for direct S3 upload
- Enables large file uploads without server processing

#### `/api/v1/recordings/confirm-upload/{upload_id}`
- **POST**: Confirm completion of direct S3 upload
- Verifies file existence and updates database

#### `/api/v1/recordings/sync-bucket`
- **POST**: Sync S3 bucket contents with database
- Automatically discovers and registers recordings in S3

#### `/api/v1/recordings/download/{session_id}`
- **GET**: Get presigned download URL for a recording
- Secure, time-limited access to recordings

#### `/api/v1/recordings/recording/{session_id}`
- **DELETE**: Remove recording from S3 and database

### S3 Integration

The S3 service provides:
- Standardized key generation: `recordings/{coach_id}/{client_id}/{date}/{filename}_{unique_id}`
- Automatic file type detection
- Server-side encryption (AES256)
- Presigned URL generation for secure uploads/downloads
- Bucket synchronization with database

### Frontend UI

Located at `/dashboard/coach/recordings`, the interface provides:
- Tabular view of all sessions with recording status
- Upload modal supporting:
  - Platform selection
  - External URL input
  - Direct file upload
- Real-time status indicators for:
  - Recording presence and upload status
  - Transcript processing status
  - Analysis processing status
- Actions:
  - Download recordings
  - View session details
  - Delete recordings
- S3 bucket synchronization button

## Configuration

### Environment Variables
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=filmroom-recordings
AWS_REGION=us-east-1
```

### Database Migration
Run the migration to add the new fields:
```bash
cd backend
alembic upgrade head
```

## Usage Flow

1. **Coach views recordings page**: Navigate to Dashboard > Recordings
2. **Upload recording**:
   - Click "Upload" for a session
   - Select platform (optional)
   - Provide external URL or select file
   - System handles upload to S3
3. **Sync bucket**: Click "Sync with S3" to discover recordings uploaded directly
4. **Manage recordings**:
   - Download for offline viewing
   - Delete unwanted recordings
   - View transcript/analysis status

## Key Design Decisions

1. **S3 Key Structure**: Organized by coach/client/date for easy browsing and management
2. **Background Processing**: External URL downloads happen asynchronously
3. **Presigned URLs**: Large files upload directly to S3 without server processing
4. **Status Tracking**: Multiple status fields track each stage of processing
5. **Upsert Logic**: Sync operation intelligently matches S3 objects to database records

## Future Enhancements

- Automatic transcription processing
- AI-powered session analysis
- Bulk upload functionality
- Recording preview in browser
- Automated backup policies
- Client access permissions

## Security Considerations

- All endpoints require authentication
- Coaches can only access their own sessions
- S3 URLs are time-limited (default 1 hour)
- Server-side encryption for all S3 objects
- Audit trail via SessionUpload records