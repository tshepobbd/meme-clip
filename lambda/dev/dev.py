from moviepy.editor import VideoFileClip, ImageClip, CompositeVideoClip
from PIL import Image
import os

def overlay_images_on_video(
    background_video_path,
    image1_path,
    image2_path,
    output_path,
    include_audio=True,
    duration_seconds: float = 6.0,
):
    """
    Overlay two images onto a background video, stacked vertically in the center.
    
    Args:
        background_video_path: Path to the background video file
        image1_path: Path to the first image to overlay
        image2_path: Path to the second image to overlay
        output_path: Path where the output video will be saved
        include_audio: If True keep background audio, else mute output
    """
    # Enforce duration bounds (default 6s, max 12s)
    if duration_seconds is None:
        duration_seconds = 6.0
    duration_seconds = max(0.1, min(float(duration_seconds), 12.0))

    # Load the background video and trim to desired duration
    print(f"Loading background video from {background_video_path}...")
    base_video = VideoFileClip(background_video_path)
    trim_end = min(duration_seconds, base_video.duration or duration_seconds)
    video = base_video.subclip(0, trim_end)
    
    # Get video dimensions
    video_width, video_height = video.size
    print(f"Video dimensions: {video_width}x{video_height}")
    
    # Load images and get their dimensions
    img1 = Image.open(image1_path)
    img2 = Image.open(image2_path)
    
    img1_width, img1_height = img1.size
    img2_width, img2_height = img2.size
    
    print(f"Image 1 dimensions: {img1_width}x{img1_height}")
    print(f"Image 2 dimensions: {img2_width}x{img2_height}")
    
    # Calculate scaling: make images fit within video width, maintaining aspect ratio
    # Leave some margin on sides (e.g., use 80% of video width for combined image area)
    max_image_width = int(video_width * 0.8)
    
    # Scale both images proportionally to fit within max_image_width
    # Calculate scale factors for both images
    scale1 = max_image_width / img1_width if img1_width > max_image_width else 1.0
    scale2 = max_image_width / img2_width if img2_width > max_image_width else 1.0
    
    # Use the smaller scale to ensure both images fit
    scale = min(scale1, scale2)
    
    # Calculate scaled dimensions
    scaled_img1_width = int(img1_width * scale)
    scaled_img1_height = int(img1_height * scale)
    scaled_img2_width = int(img2_width * scale)
    scaled_img2_height = int(img2_height * scale)
    
    # Calculate total height of stacked images
    total_images_height = scaled_img1_height + scaled_img2_height
    
    # Check if images fit vertically (leave 10% margin top/bottom)
    max_height = int(video_height * 0.9)
    if total_images_height > max_height:
        # Scale down further to fit vertically
        height_scale = max_height / total_images_height
        scale *= height_scale
        scaled_img1_width = int(img1_width * scale)
        scaled_img1_height = int(img1_height * scale)
        scaled_img2_width = int(img2_width * scale)
        scaled_img2_height = int(img2_height * scale)
        total_images_height = scaled_img1_height + scaled_img2_height
    
    print(f"Scaled image 1 dimensions: {scaled_img1_width}x{scaled_img1_height}")
    print(f"Scaled image 2 dimensions: {scaled_img2_width}x{scaled_img2_height}")
    
    # Calculate positions
    # Place first image near the top with a small margin, second image below it
    top_margin = max(int(video_height * 0.06), 10)  # ~6% of height or at least 10px
    # Increase vertical space between the two images
    vertical_gap = max(int(video_height * 0.06), 24)

    # Center horizontally
    img1_x = (video_width - scaled_img1_width) // 2
    img1_y = top_margin

    img2_x = (video_width - scaled_img2_width) // 2
    img2_y = img1_y + scaled_img1_height + vertical_gap
    
    print(f"Positioning image 1 at: ({img1_x}, {img1_y})")
    print(f"Positioning image 2 at: ({img2_x}, {img2_y})")
    
    # Create ImageClip objects from the images
    print("Creating image clips...")
    img_clip1 = ImageClip(image1_path).set_duration(video.duration).resize((scaled_img1_width, scaled_img1_height))
    img_clip2 = ImageClip(image2_path).set_duration(video.duration).resize((scaled_img2_width, scaled_img2_height))
    
    # Position the image clips
    img_clip1 = img_clip1.set_position((img1_x, img1_y))
    img_clip2 = img_clip2.set_position((img2_x, img2_y))
    
    # Composite the video with both images
    print("Compositing video with images...")
    final_video = CompositeVideoClip([video, img_clip1, img_clip2]).set_duration(video.duration)
    # Apply audio preference
    if include_audio:
        try:
            final_video = final_video.set_audio(video.audio)
        except Exception:
            pass
    else:
        final_video = final_video.set_audio(None)
    
    # Write the output video
    print(f"Writing output video to {output_path}...")
    final_video.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        fps=video.fps,
        preset='medium',
        threads=4,
        audio=include_audio
    )
    
    # Clean up
    print("Cleaning up...")
    img_clip1.close()
    img_clip2.close()
    video.close()
    base_video.close()
    final_video.close()
    
    print(f"Done! Output video saved to {output_path}")

if __name__ == "__main__":
    # Define paths
    background_video = "/app/background.mp4"
    image1 = "/app/image1.png"
    image2 = "/app/image2.png"
    output_video = "/app/clips/output.mp4"
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_video), exist_ok=True)

    print(f"Processing video with duration seconds...")
    
    # Process the video
    overlay_images_on_video(background_video, image1, image2, output_video, include_audio=False, duration_seconds=6.0)
