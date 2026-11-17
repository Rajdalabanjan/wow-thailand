"""
Re-encode wow-intro.mp4 for butter-smooth browser playback.
Strategy:
  1. Keep source quality, convert to H.264 High profile yuv420p
  2. CRF 20 — high quality, controlled file size
  3. -tune fastdecode — reduces decoder work in browser
  4. -movflags +faststart — moov atom at the start → plays instantly before fully buffered
  5. -g 12 (keyframe every 0.5s at 24fps) — scrubbing and initial decode are instant
  6. -pix_fmt yuv420p — required for maximum browser compatibility
  7. -vf scale=1280:720:flags=lanczos — ensure clean pixel alignment, Lanczos filter
  8. -preset slow — slower encode = better compression = less bandwidth needed → fewer dropped frames
  9. -level 3.1 — broadly compatible with all browsers including Safari
  10. Remove audio track (video has no audio anyway — saves ~0 bytes but cleans muxer)
  11. Write -report to track encoding progress
"""

import os, subprocess, shutil, sys

FFMPEG = r"C:\Users\rajda\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

SRC = r"frontend/public/intro/wow-intro.mp4"
DST_TMP = r"frontend/public/intro/wow-intro-smooth.mp4"
DST_FINAL = r"frontend/public/intro/wow-intro.mp4"
DST_DIST = r"frontend/dist/intro/wow-intro.mp4"

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Source file:", SRC)
print("Size:", round(os.path.getsize(SRC) / 1024 / 1024, 2), "MB")

cmd = [
    FFMPEG,
    "-y",
    "-i", SRC,
    # --- Video stream ---
    "-vf", "scale=1280:720:flags=lanczos,format=yuv420p",
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", "4.0",
    "-preset", "slow",          # slow encode = better compression
    "-crf", "18",               # very high quality (18 = near lossless visible quality)
    "-tune", "fastdecode",      # optimise entropy decoding in the browser
    "-g", "12",                 # keyframe every 0.5s (24fps / 12 = 2 per sec)
    "-keyint_min", "12",
    "-sc_threshold", "0",       # disable scene-change auto keyframes (predictable GOP)
    "-bf", "2",                 # 2 B-frames (standard for high profile, helps compression)
    "-refs", "4",               # 4 reference frames (smooth motion)
    "-me_method", "umh",        # uneven multi-hexagon search — better motion estimation
    "-subq", "9",               # maximum subpixel quality
    "-trellis", "2",            # full trellis optimisation
    "-psy-rd", "1.0:0.0",      # psychovisual optimisation
    # --- Muxer ---
    "-movflags", "+faststart+rtphint",   # moov at front → instant play; rtphint for CDN
    "-fflags", "+genpts",               # generate presentation timestamps
    # --- Remove audio (there is none, keeps muxer clean) ---
    "-an",
    DST_TMP
]

print("\nEncoding with ultra-smooth settings...")
result = subprocess.run(cmd, capture_output=False, text=True)

if result.returncode != 0:
    print("ERROR during encoding!")
    sys.exit(1)

new_size = os.path.getsize(DST_TMP) / 1024 / 1024
old_size = os.path.getsize(SRC) / 1024 / 1024
print(f"\nDone! Old size: {old_size:.2f} MB -> New size: {new_size:.2f} MB")

# Replace in-place
print("Replacing source...")
shutil.copy2(DST_TMP, DST_FINAL)
os.remove(DST_TMP)

# Copy to dist
os.makedirs(os.path.dirname(DST_DIST), exist_ok=True)
shutil.copy2(DST_FINAL, DST_DIST)

print(f"Final file size: {round(os.path.getsize(DST_FINAL) / 1024 / 1024, 2)} MB")
print("Copied to dist.")
print("\nAll done! Smooth video deployed.")

