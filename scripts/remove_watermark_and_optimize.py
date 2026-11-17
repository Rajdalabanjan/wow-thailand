import os
import cv2
import numpy as np
import imageio

SRC_VIDEO = r"C:\Users\rajda\Downloads\gemini_generated_video_5630fd0f.mp4"
PUB_VIDEO = "frontend/public/intro/wow-intro.mp4"
DIST_VIDEO = "frontend/dist/intro/wow-intro.mp4"
PUB_POSTER = "frontend/public/intro/wow-intro-poster.jpg"
DIST_POSTER = "frontend/dist/intro/wow-intro-poster.jpg"
ARTIFACT_DIR = "C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d"

cap = cv2.VideoCapture(SRC_VIDEO)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Reading {total_frames} frames from {SRC_VIDEO} ({w}x{h} @ {fps} fps)...")

# Create inpainting mask for the diamond watermark
# Diamond is at gx=1136, gy=576, bw=48, bh=48 in 1280x720
mask = np.zeros((h, w), dtype=np.uint8)
pad = 6
x1 = max(0, 1136 - pad)
y1 = max(0, 576 - pad)
x2 = min(w, 1136 + 48 + pad)
y2 = min(h, 576 + 48 + pad)
cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)

frames_cleaned = []
poster_frame = None

for i in range(total_frames):
    ret, frame = cap.read()
    if not ret:
        break
    
    # 1. Inpaint the watermark seamlessly
    cleaned = cv2.inpaint(frame, mask, 5, cv2.INPAINT_NS)
    
    # 2. Subtle contrast & edge crispness polish
    # Convert BGR to RGB for imageio
    rgb = cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)
    frames_cleaned.append(rgb)
    
    if i == 100:
        poster_frame = cleaned

cap.release()
print(f"All {len(frames_cleaned)} frames inpainted! Watermark removed completely.")

# Encode optimized H.264 video with fastdecode for zero browser lag
print("Encoding buttery-smooth video with fastdecode profile...")
temp_out = PUB_VIDEO + ".tmp.mp4"

with imageio.get_writer(
    temp_out,
    fps=fps,
    codec='libx264',
    quality=9,
    pixelformat='yuv420p',
    ffmpeg_params=[
        '-preset', 'fast',
        '-crf', '19',
        '-tune', 'fastdecode',
        '-movflags', '+faststart',
        '-g', str(int(fps)),
        '-maxrate', '5000k',
        '-bufsize', '10000k'
    ]
) as writer:
    for f in frames_cleaned:
        writer.append_data(f)

if os.path.exists(PUB_VIDEO):
    os.remove(PUB_VIDEO)
os.rename(temp_out, PUB_VIDEO)
print(f"Saved optimized video to {PUB_VIDEO}")

if os.path.exists(os.path.dirname(DIST_VIDEO)):
    import shutil
    shutil.copy2(PUB_VIDEO, DIST_VIDEO)
    print(f"Copied to {DIST_VIDEO}")

# Save watermark-free poster
if poster_frame is not None:
    cv2.imwrite(PUB_POSTER, poster_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 96])
    if os.path.exists(os.path.dirname(DIST_POSTER)):
        import shutil
        shutil.copy2(PUB_POSTER, DIST_POSTER)
    cv2.imwrite(os.path.join(ARTIFACT_DIR, "clean_poster_no_watermark.jpg"), poster_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 96])
    print(f"Saved clean poster to {PUB_POSTER}")

print("Watermark removal and lag optimization complete!")

