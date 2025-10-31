from moviepy.editor import VideoFileClip, ImageClip, CompositeVideoClip
from PIL import Image
import boto3
from botocore.exceptions import ClientError
import os
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

# Pillow 10 compatibility: restore Image.ANTIALIAS for libraries expecting it
if not hasattr(Image, "ANTIALIAS"):
    try:
        Image.ANTIALIAS = Image.Resampling.LANCZOS  # type: ignore[attr-defined]
    except Exception:
        pass


def overlay_images_on_video(
    background_video_path: str,
    image1_path: str,
    image2_path: str,
    output_path: str,
    include_audio: bool = True,
    duration_seconds: float = 6.0,
) -> None:
    """Compose two images on top of a background video and export a short clip.

    duration_seconds is capped to 12 seconds.
    """
    if duration_seconds is None:
        duration_seconds = 6.0
    duration_seconds = max(0.1, min(float(duration_seconds), 12.0))

    logger.info("Loading background video…")
    base_video = VideoFileClip(background_video_path)
    trim_end = min(duration_seconds, base_video.duration or duration_seconds)
    video = base_video.subclip(0, trim_end)

    vw, vh = video.size

    img1 = Image.open(image1_path)
    img2 = Image.open(image2_path)
    i1w, i1h = img1.size
    i2w, i2h = img2.size

    max_w = int(vw * 0.8)
    s1 = max_w / i1w if i1w > max_w else 1.0
    s2 = max_w / i2w if i2w > max_w else 1.0
    scale = min(s1, s2)

    i1w2, i1h2 = int(i1w * scale), int(i1h * scale)
    i2w2, i2h2 = int(i2w * scale), int(i2h * scale)

    total_h = i1h2 + i2h2
    max_h = int(vh * 0.9)
    if total_h > max_h:
        hs = max_h / total_h
        i1w2, i1h2 = int(i1w2 * hs), int(i1h2 * hs)
        i2w2, i2h2 = int(i2w2 * hs), int(i2h2 * hs)

    top_margin = max(int(vh * 0.06), 10)
    vertical_gap = max(int(vh * 0.06), 24)
    i1x = (vw - i1w2) // 2
    i1y = top_margin
    i2x = (vw - i2w2) // 2
    i2y = i1y + i1h2 + vertical_gap

    imgc1 = ImageClip(image1_path).set_duration(video.duration).resize((i1w2, i1h2)).set_position((i1x, i1y))
    imgc2 = ImageClip(image2_path).set_duration(video.duration).resize((i2w2, i2h2)).set_position((i2x, i2y))

    final = CompositeVideoClip([video, imgc1, imgc2]).set_duration(video.duration)

    if include_audio and video.audio is not None:
        final = final.set_audio(video.audio)
    else:
        final = final.set_audio(None)

    temp_audio = "/tmp/temp-audio.m4a"
    final.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=(video.fps or 24),
        preset="medium",
        threads=2,
        audio=include_audio,
        temp_audiofile=temp_audio,
        remove_temp=True,
        logger=None,
    )

    imgc1.close()
    imgc2.close()
    video.close()
    base_video.close()
    final.close()


def lambda_handler(event, context):
    """AWS Lambda entrypoint.

    Expected event fields:
      - background_bucket, background_key
      - image1_bucket, image1_key
      - image2_bucket, image2_key
      - output_bucket, output_key
      - include_audio (optional, default True)
      - duration_seconds (optional, default 6, max 12)
    """
    try:
        # Support both direct invocation (dict of fields) and SQS trigger (Records list)
        payload = event
        if isinstance(event, dict) and "Records" in event:
            # Take first record; expected body is JSON
            record = event["Records"][0]
            body = record.get("body", "{}")
            try:
                payload = json.loads(body)
            except Exception:
                logger.error("Failed to parse SQS message body as JSON: %s", body)
                raise

        background_bucket = payload["background_bucket"]
        background_key = payload["background_key"]
        image1_bucket = payload.get("image1_bucket", background_bucket)
        image1_key = payload["image1_key"]
        image2_bucket = payload.get("image2_bucket", background_bucket)
        image2_key = payload["image2_key"]
        output_bucket = payload["output_bucket"]
        output_key = payload["output_key"]
        include_audio = bool(payload.get("include_audio", True))
        duration_seconds = float(payload.get("duration_seconds", 6.0))

        tmp = "/tmp"
        bg_path = os.path.join(tmp, "background.mp4")
        i1_path = os.path.join(tmp, "image1.png")
        i2_path = os.path.join(tmp, "image2.png")
        out_path = os.path.join(tmp, "output.mp4")

        logger.info(
            "Downloading inputs from S3… bg=%s/%s, i1=%s/%s, i2=%s/%s",
            background_bucket,
            background_key,
            image1_bucket,
            image1_key,
            image2_bucket,
            image2_key,
        )

        # Pre-flight head checks for clearer errors
        try:
            s3.head_object(Bucket=background_bucket, Key=background_key)
            s3.head_object(Bucket=image1_bucket, Key=image1_key)
            s3.head_object(Bucket=image2_bucket, Key=image2_key)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            logger.error(
                "S3 head_object failed: %s. bg=%s/%s, i1=%s/%s, i2=%s/%s",
                code,
                background_bucket,
                background_key,
                image1_bucket,
                image1_key,
                image2_bucket,
                image2_key,
            )
            raise

        # Downloads
        try:
            s3.download_file(background_bucket, background_key, bg_path)
            s3.download_file(image1_bucket, image1_key, i1_path)
            s3.download_file(image2_bucket, image2_key, i2_path)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            logger.error("S3 download failed: %s", code)
            raise

        overlay_images_on_video(
            bg_path,
            i1_path,
            i2_path,
            out_path,
            include_audio=include_audio,
            duration_seconds=duration_seconds,
        )

        logger.info("Uploading result to S3…")
        s3.upload_file(out_path, output_bucket, output_key)

        # best-effort cleanup
        for p in [bg_path, i1_path, i2_path, out_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
         logger.info("Video Processing")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "ok",
                "output": f"s3://{output_bucket}/{output_key}",
            }),
        }
    except Exception as e:
        logger.exception("Lambda failed")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


