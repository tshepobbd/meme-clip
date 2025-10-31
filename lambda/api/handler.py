"""
Lambda function to receive images from Next.js, upload to S3, and trigger video processing.
This function is exposed via API Gateway and handles multipart/form-data uploads.
"""

import boto3
from botocore.exceptions import ClientError
import json
import logging
import os
import uuid
from datetime import datetime
from base64 import b64decode

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')

# Get environment variables
S3_BUCKET = os.environ.get('S3_BUCKET')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')
OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET', S3_BUCKET)  # Default to same bucket
DEFAULT_BACKGROUND_KEY = os.environ.get('DEFAULT_BACKGROUND_KEY', 'backgrounds/background.mp4')


def lambda_handler(event, context):
    """
    Handle API Gateway requests.
    
    Two modes:
    1. GET /process?action=presign - Returns presigned S3 URLs for uploading images
    2. POST /process - Accepts S3 keys (image1_key, image2_key) and triggers processing
    """
    try:
        http_method = event.get('httpMethod', '')
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # Handle GET request for presigned URLs or status check
        if http_method == 'GET':
            query_params = event.get('queryStringParameters') or {}
            action = query_params.get('action')
            
            if action == 'presign':
                job_id = query_params.get('job_id') or str(uuid.uuid4())[:8]
                image1_id = str(uuid.uuid4())[:12]
                image2_id = str(uuid.uuid4())[:12]
                
                # Get content types from query params (fallback to image/png for compatibility)
                image1_type = query_params.get('image1_type', 'image/png')
                image2_type = query_params.get('image2_type', 'image/png')
                
                # Determine file extension based on content type
                ext1 = 'jpg' if 'jpeg' in image1_type.lower() else ('heic' if 'heic' in image1_type.lower() else 'png')
                ext2 = 'jpg' if 'jpeg' in image2_type.lower() else ('heic' if 'heic' in image2_type.lower() else 'png')
                
                image1_key = f"images/{image1_id}.{ext1}"
                image2_key = f"images/{image2_id}.{ext2}"
                
                # Generate presigned URLs with the correct content type (valid for 5 minutes)
                image1_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={'Bucket': S3_BUCKET, 'Key': image1_key, 'ContentType': image1_type},
                    ExpiresIn=300
                )
                image2_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={'Bucket': S3_BUCKET, 'Key': image2_key, 'ContentType': image2_type},
                    ExpiresIn=300
                )
                
                return {
                    'statusCode': 200,
                    'headers': {**headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'job_id': job_id,
                        'image1_key': image1_key,
                        'image1_url': image1_url,
                        'image2_key': image2_key,
                        'image2_url': image2_url,
                    })
                }
            
            elif action == 'status':
                job_id = query_params.get('job_id')
                if not job_id:
                    return {
                        'statusCode': 400,
                        'headers': {**headers, 'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'job_id is required'})
                    }
                
                output_key = f"outputs/{job_id}.mp4"
                
                # Check if output file exists in S3
                try:
                    logger.info(f"Checking S3 for output: s3://{OUTPUT_BUCKET}/{output_key}")
                    s3_client.head_object(Bucket=OUTPUT_BUCKET, Key=output_key)
                    # File exists - generate a presigned URL for download (valid for 1 hour)
                    download_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': OUTPUT_BUCKET, 'Key': output_key},
                        ExpiresIn=3600
                    )
                    logger.info(f"Output file found, generated download URL")
                    return {
                        'statusCode': 200,
                        'headers': {**headers, 'Content-Type': 'application/json'},
                        'body': json.dumps({
                            'status': 'completed',
                            'job_id': job_id,
                            'output_key': output_key,
                            'download_url': download_url,
                            'output_url': f"s3://{OUTPUT_BUCKET}/{output_key}"
                        })
                    }
                except ClientError as e:
                    error_code = e.response.get('Error', {}).get('Code', '')
                    error_message = str(e)
                    logger.info(f"S3 head_object error: {error_code} - {error_message}")
                    if error_code == '404' or error_code == 'NoSuchKey':
                        return {
                            'statusCode': 200,
                            'headers': {**headers, 'Content-Type': 'application/json'},
                            'body': json.dumps({
                                'status': 'processing',
                                'job_id': job_id,
                                'output_key': output_key
                            })
                        }
                    else:
                        # For 403, still return processing status (might be permission propagation delay)
                        logger.warning(f"Unexpected S3 error ({error_code}): {error_message}. Returning processing status.")
                        return {
                            'statusCode': 200,
                            'headers': {**headers, 'Content-Type': 'application/json'},
                            'body': json.dumps({
                                'status': 'processing',
                                'job_id': job_id,
                                'output_key': output_key,
                                'message': 'Checking status...'
                            })
                        }

        # Handle POST request - expects S3 keys (images already uploaded via presigned URLs)
        if http_method == 'POST':
            body = event.get('body', '')
            if event.get('isBase64Encoded', False):
                body = b64decode(body).decode('utf-8')
            
            try:
                data = json.loads(body) if body else {}
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {**headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Invalid JSON body'})
                }
            
            # Get required S3 keys (images should already be uploaded via presigned URLs)
            job_id = data.get('job_id')
            image1_key = data.get('image1_key')
            image2_key = data.get('image2_key')
            
            if not job_id or not image1_key or not image2_key:
                return {
                    'statusCode': 400,
                    'headers': {**headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Missing required fields: job_id, image1_key, image2_key'
                    })
                }
            
            # Get optional parameters
            background_key = data.get('background_key', DEFAULT_BACKGROUND_KEY)
            ia_val = data.get('include_audio', True)
            if isinstance(ia_val, str):
                include_audio = ia_val.strip().lower() not in ('false', '0', 'no', 'off', '')
            else:
                include_audio = bool(ia_val)
            
            ds_val = data.get('duration_seconds', 6.0)
            try:
                duration_seconds = float(ds_val)
            except Exception:
                duration_seconds = 6.0
            
            # Generate output key
            output_key = f"outputs/{job_id}.mp4"
            
            # Verify images exist in S3 before triggering processing
            logger.info(f"Verifying images exist in S3: {image1_key}, {image2_key}")
            try:
                s3_client.head_object(Bucket=S3_BUCKET, Key=image1_key)
                s3_client.head_object(Bucket=S3_BUCKET, Key=image2_key)
            except ClientError as e:
                return {
                    'statusCode': 404,
                    'headers': {**headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': f'Image not found in S3: {image1_key if "image1" in str(e) else image2_key}'
                    })
                }
            
            # Send SQS message to trigger video processing
            sqs_message = {
                'background_bucket': S3_BUCKET,
                'background_key': background_key,
                'image1_bucket': S3_BUCKET,
                'image1_key': image1_key,
                'image2_bucket': S3_BUCKET,
                'image2_key': image2_key,
                'output_bucket': OUTPUT_BUCKET,
                'output_key': output_key,
                'include_audio': include_audio,
                'duration_seconds': duration_seconds,
            }

            logger.info(f"Sending SQS message: {json.dumps(sqs_message)}")
            sqs_client.send_message(
                QueueUrl=SQS_QUEUE_URL,
                MessageBody=json.dumps(sqs_message)
            )

            return {
                'statusCode': 200,
                'headers': {**headers, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Video processing queued',
                    'job_id': job_id,
                    'image1_key': image1_key,
                    'image2_key': image2_key,
                    'output_key': output_key,
                    'output_url': f"s3://{OUTPUT_BUCKET}/{output_key}"
                })
            }
        
        # Unknown method
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }

    except Exception as e:
        logger.exception("Error processing request")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({
                'error': str(e)
            })
        }


def parse_multipart(body, boundary):
    """Parse multipart/form-data body."""
    parts = body.split(f'--{boundary}')
    images = {}
    form_data = {}
    
    for part in parts:
        if not part.strip() or part.strip() == '--':
            continue
        
        # Split headers and content
        if '\r\n\r\n' in part:
            headers_raw, content = part.split('\r\n\r\n', 1)
        elif '\n\n' in part:
            headers_raw, content = part.split('\n\n', 1)
        else:
            continue
        
        headers = {}
        for line in headers_raw.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                headers[key.strip().lower()] = value.strip()
        
        content_disposition = headers.get('content-disposition', '')
        
        # Extract field name
        if 'name="' in content_disposition:
            field_name = content_disposition.split('name="')[1].split('"')[0]
        else:
            continue
        
        # Check if it's a file upload
        if 'filename=' in content_disposition:
            # It's a file
            images[field_name] = content.rstrip('\r\n')
        else:
            # It's a form field
            form_data[field_name] = content.rstrip('\r\n')
    
    return images, form_data

