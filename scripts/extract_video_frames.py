import cv2
import os

video_path = r"C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/.user_uploaded/media_1794804334513_947af94b.mp4"
artifact_dir = r"C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d"

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Video details: {width}x{height}, {fps:.2f} fps, {total_frames} frames, {duration:.2f} seconds")

# Extract 6-8 evenly spaced frames
num_extracts = 8
step = max(1, total_frames // num_extracts)

saved_frames = []
for i in range(num_extracts):
    frame_idx = min(total_frames - 1, i * step)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if ret:
        out_name = f"user_video_frame_{i}.png"
        out_path = os.path.join(artifact_dir, out_name)
        cv2.imwrite(out_path, frame)
        saved_frames.append(out_name)
        timestamp = frame_idx / fps if fps > 0 else 0
        print(f"Saved {out_name} at frame {frame_idx} (t={timestamp:.2f}s)")

cap.release()
print("Done extracting frames!")

