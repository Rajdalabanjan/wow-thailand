import os
import cv2
import numpy as np
import imageio

INPUT_VIDEO = "frontend/public/intro/wow-intro.mp4"
OUTPUT_VIDEO = "frontend/public/intro/wow-intro.mp4"
BACKUP_VIDEO = "frontend/public/intro/wow-intro-blue-backup.mp4"
POSTER_OUTPUT = "frontend/public/intro/wow-intro-poster.jpg"
DIST_VIDEO = "frontend/dist/intro/wow-intro.mp4"
DIST_POSTER = "frontend/dist/intro/wow-intro-poster.jpg"
ARTIFACT_DIR = "C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d"

# Backup original if backup doesn't exist yet
if not os.path.exists(BACKUP_VIDEO):
    import shutil
    shutil.copy2(INPUT_VIDEO, BACKUP_VIDEO)
    print(f"Backed up original blue video to {BACKUP_VIDEO}")

cap = cv2.VideoCapture(BACKUP_VIDEO)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
in_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
in_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Processing {total_frames} frames ({in_w}x{in_h} @ {fps} fps)...")

# Target dimensions (Full HD 1920x1080 for crisp commercial motion graphics)
OUT_W = 1920
OUT_H = 1080

def grade_frame_to_golden_amber(frame_bgr):
    # Upscale to 1080p
    resized = cv2.resize(frame_bgr, (OUT_W, OUT_H), interpolation=cv2.INTER_LANCZOS4)
    
    # Convert to HSV float
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    
    # Masks for blue, cyan, indigo, and purple lighting/particles/contrails
    # OpenCV Hue: 0-180. Cyan ~82-100, Blue ~100-132, Indigo/Violet ~132-168
    blue_glow = (h >= 80) & (h <= 168) & (s > 28)
    mild_tint = (h >= 80) & (h <= 168) & (s <= 28) & (v > 35)
    
    # Golden-amber (#F5A623: Hue ~19, #FFB800: Hue ~21)
    # Map original hues 80..168 smoothly to 17..24 for rich dimensional gold tones
    t = (h - 80.0) / 88.0
    gold_hue = 17.5 + t * 6.5
    h[blue_glow] = gold_hue[blue_glow]
    
    # Enhance golden vibrancy
    s[blue_glow] = np.clip(s[blue_glow] * 1.22, 0, 255)
    v[blue_glow] = np.clip(v[blue_glow] * 1.08, 0, 255)
    
    # Shift metallic chrome edge reflections to warm champagne-gold
    h[mild_tint] = 20.0
    s[mild_tint] = np.clip(s[mild_tint] * 0.9, 0, 255)
    
    # Reconstruct
    hsv_graded = np.stack([h, s, v], axis=2).astype(np.uint8)
    bgr_graded = cv2.cvtColor(hsv_graded, cv2.COLOR_HSV2BGR)
    
    # Refine channels: ensure deep obsidian #0D1117 background has zero leftover blue haze
    b, g, r = cv2.split(bgr_graded.astype(np.float32))
    
    # Suppress dark blue cast in shadows
    shadow_mask = (v < 85) & (b > r + 8)
    b[shadow_mask] = b[shadow_mask] * 0.45
    
    # Warm champagne edge glint: subtly boost red/green on high-luminance chrome highlights
    bright_metal = (v > 180) & (s < 50)
    r[bright_metal] = np.clip(r[bright_metal] * 1.04, 0, 255)
    g[bright_metal] = np.clip(g[bright_metal] * 1.02, 0, 255)
    
    final_bgr = np.clip(cv2.merge([b, g, r]), 0, 255).astype(np.uint8)
    
    # Subtle unsharp mask for 4K crispness on typography
    blurred = cv2.GaussianBlur(final_bgr, (0, 0), 1.5)
    sharpened = cv2.addWeighted(final_bgr, 1.15, blurred, -0.15, 0)
    
    return sharpened

frames_graded = []
poster_frame = None

for i in range(total_frames):
    ret, frame = cap.read()
    if not ret:
        break
    graded = grade_frame_to_golden_amber(frame)
    # Convert to RGB for imageio
    frame_rgb = cv2.cvtColor(graded, cv2.COLOR_BGR2RGB)
    frames_graded.append(frame_rgb)
    
    # Frame 126 or 75% is the perfect hero poster frame showing full logo and contrail
    if i == int(total_frames * 0.75):
        poster_frame = graded

cap.release()

# Save MP4 video with high-bitrate H.264
print(f"Encoding {len(frames_graded)} frames to {OUTPUT_VIDEO} using H.264...")
temp_output = OUTPUT_VIDEO + ".tmp.mp4"
with imageio.get_writer(
    temp_output,
    fps=fps,
    codec='libx264',
    quality=9,
    pixelformat='yuv420p',
    ffmpeg_params=['-preset', 'slow', '-crf', '18', '-movflags', '+faststart']
) as writer:
    for f in frames_graded:
        writer.append_data(f)

# Replace target
if os.path.exists(OUTPUT_VIDEO):
    os.remove(OUTPUT_VIDEO)
os.rename(temp_output, OUTPUT_VIDEO)
print(f"Saved golden luxury video to {OUTPUT_VIDEO}")

# Copy to dist if dist exists
if os.path.exists(os.path.dirname(DIST_VIDEO)):
    import shutil
    shutil.copy2(OUTPUT_VIDEO, DIST_VIDEO)
    print(f"Copied to {DIST_VIDEO}")

# Save poster
if poster_frame is not None:
    cv2.imwrite(POSTER_OUTPUT, poster_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print(f"Saved poster to {POSTER_OUTPUT}")
    if os.path.exists(os.path.dirname(DIST_POSTER)):
        import shutil
        shutil.copy2(POSTER_OUTPUT, DIST_POSTER)
    # Also save in artifact directory for viewing
    cv2.imwrite(os.path.join(ARTIFACT_DIR, "wow_intro_golden_poster.jpg"), poster_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

print("Golden luxury travel intro video generation complete!")

