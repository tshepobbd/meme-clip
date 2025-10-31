# API Lambda Function

This Lambda function receives images from the Next.js frontend via API Gateway, uploads them to S3, and triggers video processing via SQS.

## Endpoint

POST `/process`

## Request Format

### Option 1: JSON with base64-encoded images (Recommended)

```json
{
  "image1": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "image2": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "background_key": "backgrounds/background.mp4", // optional
  "include_audio": true, // optional, default: true
  "duration_seconds": 6.0 // optional, default: 6.0, max: 12.0
}
```

### Option 2: multipart/form-data

```
image1: [file]
image2: [file]
background_key: "backgrounds/background.mp4"  // optional
include_audio: "true"                         // optional
duration_seconds: "6.0"                       // optional
```

## Response

```json
{
  "message": "Images uploaded and video processing queued",
  "job_id": "abc12345",
  "output_key": "outputs/20241031/123456/abc12345/output.mp4",
  "output_url": "s3://bucket/outputs/20241031/123456/abc12345/output.mp4"
}
```

## Environment Variables

- `S3_BUCKET`: S3 bucket for storing images and outputs
- `OUTPUT_BUCKET`: S3 bucket for outputs (defaults to S3_BUCKET)
- `SQS_QUEUE_URL`: SQS queue URL for triggering video processing
- `DEFAULT_BACKGROUND_KEY`: Default background video key (default: "backgrounds/background.mp4")

aws lambda update-function-code --function-name meme-clip-api --zip-file fileb://api_lambda.zip --region us-east-1

aws lambda wait function-updated --function-name meme-clip-api --region us-east-1; Write-Host "Lambda update complete!"
