import os
import cv2
import numpy as np
import imageio

DIR = "C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d"
OUTPUT_MP4 = "e:/wow tailend/frontend/public/wow_luxury_intro_reel.mp4"
DIST_MP4 = "e:/wow tailend/frontend/dist/wow_luxury_intro_reel.mp4"

# Source Images
IMG_LOGO = os.path.join(DIR, "wow_thailand_gold_brand_logo_1794481804086.jpg")
IMG_YACHT = os.path.join(DIR, "wow_thailand_luxury_yacht_1794481738507.jpg")
IMG_VILLA = os.path.join(DIR, "wow_thailand_cliffside_villa_1794481759415.jpg")
IMG_LAGOON = os.path.join(DIR, "wow_thailand_beachfront_lagoon_resort_1794481780851.jpg")

FPS = 24
WIDTH = 1920
HEIGHT = 1080
LETTERBOX = 50 # 21:9 cinematic black bars top and bottom

def load_and_resize(path):
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Could not load image: {path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img_rgb

def apply_cinematic_grade(frame):
    # Add subtle vignette
    h, w, _ = frame.shape
    # Draw letterbox bars
    frame[0:LETTERBOX, :] = [3, 7, 18]
    frame[h-LETTERBOX:h, :] = [3, 7, 18]
    
    # Gold border lines on letterbox
    cv2.line(frame, (0, LETTERBOX), (w, LETTERBOX), (245, 197, 24), 1)
    cv2.line(frame, (0, h-LETTERBOX), (w, h-LETTERBOX), (245, 197, 24), 1)
    return frame

def render_ken_burns(img, num_frames, zoom_start=1.0, zoom_end=1.08, pan_x=0, pan_y=0):
    h, w, _ = img.shape
    frames = []
    
    for i in range(num_frames):
        t = i / max(1, num_frames - 1)
        # Smooth ease in-out
        t_smooth = t * t * (3.0 - 2.0 * t)
        
        current_zoom = zoom_start + (zoom_end - zoom_start) * t_smooth
        curr_pan_x = pan_x * t_smooth
        curr_pan_y = pan_y * t_smooth
        
        # Crop window
        crop_w = int(WIDTH / current_zoom)
        crop_h = int(HEIGHT / current_zoom)
        
        # Center in image + pan
        cx = int(w / 2 + curr_pan_x)
        cy = int(h / 2 + curr_pan_y)
        
        x1 = max(0, min(w - crop_w, cx - crop_w // 2))
        y1 = max(0, min(h - crop_h, cy - crop_h // 2))
        x2 = x1 + crop_w
        y2 = y1 + crop_h
        
        crop = img[y1:y2, x1:x2]
        resized = cv2.resize(crop, (WIDTH, HEIGHT), interpolation=cv2.INTER_LANCZOS4)
        
        # Add cinematic grade
        graded = apply_cinematic_grade(resized)
        frames.append(graded)
        
    return frames

def cross_dissolve(frames1, frames2, dissolve_len=14):
    out = []
    # Keep frames1 up to transition
    base1 = frames1[:-dissolve_len]
    trans1 = frames1[-dissolve_len:]
    trans2 = frames2[:dissolve_len]
    base2 = frames2[dissolve_len:]
    
    out.extend(base1)
    for i in range(dissolve_len):
        alpha = i / float(dissolve_len)
        # Add subtle exposure bloom in middle
        bloom = np.sin(alpha * np.pi) * 20.0
        blended = cv2.addWeighted(trans1[i], 1.0 - alpha, trans2[i], alpha, 0)
        if bloom > 0:
            blended = cv2.add(blended, np.full_like(blended, int(bloom)))
        out.append(blended)
    out.extend(base2)
    return out

def main():
    print("Loading 4k luxury images...")
    img_logo = load_and_resize(IMG_LOGO)
    img_yacht = load_and_resize(IMG_YACHT)
    img_villa = load_and_resize(IMG_VILLA)
    img_lagoon = load_and_resize(IMG_LAGOON)
    
    print("Generating scene motion frames...")
    # Scene 1: 3D Logo Reveal (72 frames = 3.0s)
    s1 = render_ken_burns(img_logo, 72, zoom_start=1.0, zoom_end=1.06, pan_x=0, pan_y=0)
    
    # Scene 2: Luxury Yacht (72 frames = 3.0s)
    s2 = render_ken_burns(img_yacht, 72, zoom_start=1.08, zoom_end=1.0, pan_x=40, pan_y=-20)
    
    # Scene 3: Cliffside Pool Villa (72 frames = 3.0s)
    s3 = render_ken_burns(img_villa, 72, zoom_start=1.0, zoom_end=1.07, pan_x=-30, pan_y=15)
    
    # Scene 4: Beachfront Lagoon Resort (72 frames = 3.0s)
    s4 = render_ken_burns(img_lagoon, 72, zoom_start=1.06, zoom_end=1.0, pan_x=20, pan_y=30)
    
    # Scene 5: Grand Finale Logo Return (64 frames = 2.6s)
    s5 = render_ken_burns(img_logo, 64, zoom_start=1.04, zoom_end=1.08, pan_x=0, pan_y=0)
    
    print("Compositing smooth transitions...")
    video_frames = cross_dissolve(s1, s2, 14)
    video_frames = cross_dissolve(video_frames, s3, 14)
    video_frames = cross_dissolve(video_frames, s4, 14)
    video_frames = cross_dissolve(video_frames, s5, 14)
    
    print(f"Total frames: {len(video_frames)}, Duration: {len(video_frames) / FPS:.2f}s")
    
    # Write MP4 using libx264
    os.makedirs(os.path.dirname(OUTPUT_MP4), exist_ok=True)
    print(f"Encoding MP4 to {OUTPUT_MP4} via imageio (libx264)...")
    
    writer = imageio.get_writer(
        OUTPUT_MP4, 
        fps=FPS, 
        codec='libx264', 
        quality=9,
        pixelformat='yuv420p',
        macro_block_size=None
    )
    
    for f in video_frames:
        writer.append_data(f)
    writer.close()
    
    size_mb = os.path.getsize(OUTPUT_MP4) / (1024 * 1024)
    print(f"SUCCESS! Output saved: {OUTPUT_MP4} ({size_mb:.2f} MB)")
    
    # Also copy to dist if dist exists
    if os.path.exists(os.path.dirname(DIST_MP4)):
        import shutil
        shutil.copy2(OUTPUT_MP4, DIST_MP4)
        print(f"Copied to {DIST_MP4}")

if __name__ == "__main__":
    main()

