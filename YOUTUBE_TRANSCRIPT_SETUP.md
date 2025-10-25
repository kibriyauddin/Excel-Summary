# YouTube Transcript Integration Guide

## Changes Made

### 1. Updated Gemini Model
- Changed from `gemini-2.0-flash` to `gemini-2.5-flash` in `YouTubeSummarizer.tsx`

### 2. Supadata API Integration
- Integrated Supadata API (https://supadata.ai/youtube-transcript-api) for fetching YouTube transcripts
- No backend setup required - direct API calls from the frontend
- Gets actual video transcripts instead of just video descriptions

## How It Works

1. User enters a YouTube URL
2. Video ID is extracted from the URL
3. Supadata API is called with the video ID: `https://api.supadata.ai/v1/youtube/transcript?video_id={videoId}`
4. API returns the full transcript with timestamps
5. Transcript segments are joined into a single text
6. Gemini 2.5 Flash model processes the transcript to generate summaries

## Setup

No deployment needed! The integration works out of the box:

1. Start your development server:
```bash
npm run dev
```

2. Navigate to the YouTube Summary tab
3. Enter a YouTube video URL (make sure it has captions/subtitles)
4. Click "Generate Summary"

## Benefits

- **Real Transcripts**: Gets actual video transcripts instead of descriptions
- **Better Summaries**: More accurate summaries based on what's actually said in the video
- **Latest Model**: Uses Gemini 2.5 Flash for improved AI processing
- **No Backend**: Direct API calls - no server or Edge Functions needed
- **Free API**: Supadata provides free access to YouTube transcripts

## API Details

### Supadata YouTube Transcript API

**Endpoint:**
```
GET https://api.supadata.ai/v1/youtube/transcript?video_id={videoId}
```

**Response Format:**
```json
{
  "transcript": [
    {
      "text": "Hello everyone",
      "start": 0.0,
      "duration": 2.5
    },
    {
      "text": "Welcome to this video",
      "start": 2.5,
      "duration": 3.0
    }
  ]
}
```

## Troubleshooting

If you get "No transcript available":
- The video might not have captions/subtitles enabled
- Try a different video with auto-generated captions
- Some videos may have transcripts disabled by the creator

If the API call fails:
- Check your internet connection
- Verify the video ID is correct
- The video might be private or restricted
