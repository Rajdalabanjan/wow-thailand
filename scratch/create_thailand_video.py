import os
import sys
import numpy as np
import cv2
from PIL import Image
import subprocess

# Paths
INPUT_IMAGE = r"e:\wow tailend\concept1.jpg"
OUTPUT_VIDEO_PUBLIC = r"e:\wow tailend\frontend\public\thailand.mp4"
OUTPUT_VIDEO_ASSETS = r"e:\wow tailend\frontend\assets\thailand.mp4"
FFMPEG_EXE = r"C:\Users\rajda\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

def generate_video():
    print(f"Reading input image: {INPUT_IMAGE}")
    if not os.path.exists(INPUT_IMAGE):
        print("Error: Input image does not exist!")
        return False
    
    img = cv2.imread(INPUT_IMAGE)
    h_orig, w_orig, _ = img.shape
    print(f"Original image size: {w_orig}x{h_orig}")
    
    # Target resolution
    out_w, out_h = 1280, 720
    fps = 24
    duration_sec = 10
    total_frames = fps * duration_sec  # 240 frames
    
    # Setup ffmpeg process pipe
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{out_w}x{out_h}",
        "-pix_fmt", "bgr24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "18",
        "-movflags", "+faststart",
        OUTPUT_VIDEO_PUBLIC
    ]
    
    print(f"Starting FFmpeg encoder...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Precompute base crop parameters
    # Aspect ratio of 1280/720 is 16:9 = 1.7778
    # concept1.jpg is 1376x768 (ratio 1.7916)
    target_aspect = out_w / out_h
    
    # Crop base to exactly 16:9
    base_w = int(h_orig * target_aspect)
    if base_w > w_orig:
        base_w = w_orig
        base_h = int(w_orig / target_aspect)
    else:
        base_h = h_orig
        
    start_x = (w_orig - base_w) // 2
    start_y = (h_orig - base_h) // 2
    cropped_base = img[start_y:start_y + base_h, start_x:start_x + base_w]
    cb_h, cb_w, _ = cropped_base.shape
    
    # Generate meshgrid for water wave displacement
    # Water starts roughly around 42% of height to 100%
    y_coords, x_coords = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
    
    # Water mask: 0 in sky/cliffs, smoothly ramping from 0.0 to 1.0 between 38% and 60% height
    water_weight = np.clip((y_coords - out_h * 0.38) / (out_h * 0.22), 0.0, 1.0)
    
    print(f"Rendering {total_frames} cinematic frames with camera glide & living water motion...")
    
    for i in range(total_frames):
        # Seamless looping progress: 0 -> 2*pi
        phase = 2.0 * np.pi * (i / total_frames)
        
        # Smooth camera zoom and glide (using cosine so start and end match perfectly)
        zoom = 1.0 + 0.045 * (1.0 - np.cos(phase)) * 0.5  # 1.0 to 1.045
        pan_x = np.sin(phase) * 12.0  # -12px to +12px glide
        pan_y = np.cos(phase) * 6.0   # -6px to +6px subtle vertical breathe
        
        # Crop window based on zoom
        crop_w = int(cb_w / zoom)
        crop_h = int(cb_h / zoom)
        cx = int((cb_w - crop_w) / 2 + pan_x)
        cy = int((cb_h - crop_h) / 2 + pan_y)
        
        # Clamp bounds
        cx = max(0, min(cx, cb_w - crop_w))
        cy = max(0, min(cy, cb_h - crop_h))
        
        frame_crop = cropped_base[cy:cy + crop_h, cx:cx + crop_w]
        frame_resized = cv2.resize(frame_crop, (out_w, out_h), interpolation=cv2.INTER_LINEAR)
        
        # Apply water ripple displacement
        # 2 overlapping wave frequencies
        wave_dy = (np.sin(x_coords * 0.035 + phase * 2.0) * 1.8 +
                   np.cos(x_coords * 0.015 - phase * 3.0) * 1.2) * water_weight
        
        wave_dx = (np.cos(y_coords * 0.025 + phase * 2.0) * 1.2) * water_weight
        
        map_x = np.clip(x_coords + wave_dx, 0, out_w - 1).astype(np.float32)
        map_y = np.clip(y_coords + wave_dy, 0, out_h - 1).astype(np.float32)
        
        frame_warped = cv2.remap(frame_resized, map_x, map_y, interpolation=cv2.INTER_LINEAR)
        
        # Subtle sunlight shimmer on water
        shimmer = (np.sin(x_coords * 0.05 + y_coords * 0.03 + phase * 4.0) * 3.5) * water_weight
        frame_final = np.clip(frame_warped.astype(np.float32) + shimmer[:, :, np.newaxis], 0, 255).astype(np.uint8)
        
        proc.stdin.write(frame_final.tobytes())
        
        if (i + 1) % 48 == 0 or i == total_frames - 1:
            print(f"  Frame {i + 1}/{total_frames} ({int((i+1)/total_frames*100)}%)")
            
    proc.stdin.close()
    proc.wait()
    
    if os.path.exists(OUTPUT_VIDEO_PUBLIC) and os.path.getsize(OUTPUT_VIDEO_PUBLIC) > 0:
        file_size = os.path.getsize(OUTPUT_VIDEO_PUBLIC)
        print(f"Successfully generated Thailand video: {OUTPUT_VIDEO_PUBLIC} ({file_size} bytes)")
        
        # Also copy to frontend/assets/
        os.makedirs(os.path.dirname(OUTPUT_VIDEO_ASSETS), exist_ok=True)
        import shutil
        shutil.copy2(OUTPUT_VIDEO_PUBLIC, OUTPUT_VIDEO_ASSETS)
        
        # Also copy to e:\wow tailend\thailand.mp4
        root_copy = r"e:\wow tailend\thailand.mp4"
        shutil.copy2(OUTPUT_VIDEO_PUBLIC, root_copy)
        print(f"Copied to assets and root: {OUTPUT_VIDEO_ASSETS}")
        return True
    else:
        stderr = proc.stderr.read().decode('utf-8', errors='ignore')
        print(f"Error generating video: {stderr}")
        return False

if __name__ == '__main__':
    success = generate_video()
    if not success:
        sys.exit(1)
