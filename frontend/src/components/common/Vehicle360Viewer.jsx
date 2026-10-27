import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Play, 
  Pause, 
  Compass, 
  Sparkles, 
  ShieldCheck, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Layers,
  Box,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ThreeVehicleViewer from './ThreeVehicleViewer';
import { getVehicle3DModel, getRequired3DAssetInfo } from '../../utils/vehicle360Helper';

/**
 * Vehicle360Viewer
 * Precision 360-degree vehicle showroom viewer.
 * 
 * Features:
 * 1. Shows authentic, high-resolution photographs uploaded in the Vendor Portal by default.
 *    - Real paint colors, real carbon fiber, real badges, and real photography.
 *    - Continuous horizontal mouse drag & touch gestures cycle smoothly through uploaded real photos.
 * 2. Full Cardinal Angle Controls (Front 0°, Side 90°, Rear 180°, Left 270°):
 *    - Transitions directly to the matching real photo angle.
 * 3. Auto 360° Spin:
 *    - Cycles smoothly through real photos; auto-pauses on manual drag.
 * 4. Optional 3D Model Toggle:
 *    - If a verified 3D GLB model exists, users can toggle between Real Photos and 3D WebGL mode.
 */
export default function Vehicle360Viewer({
  images = [],
  angles = null,
  frames = null,
  model3d = null,
  vehicle = null,
  vehicleName = 'Vehicle',
  vehicleType = 'bike', // 'bike' | 'car'
  features = [],
  height = '440px',
  onClose,
  onSwitchToGallery
}) {
  const [model3dError, setModel3dError] = useState(null);

  // ── 1. RESOLVE 3D MODEL ASSET ──
  const active3DModel = useMemo(() => {
    if (model3d && model3d.url) return model3d;
    if (vehicle) return getVehicle3DModel(vehicle);
    return getVehicle3DModel({ name: vehicleName, category: vehicleType });
  }, [model3d, vehicle, vehicleName, vehicleType]);

  const has3D = Boolean(active3DModel && active3DModel.url && !model3dError);

  // Mode: Default to '3d' mode when genuine 3D model exists, otherwise 'photo'
  const [renderMode, setRenderMode] = useState(has3D ? '3d' : 'photo');
  const [angle, setAngle] = useState(0); // 0 to 359.9 degrees
  const [targetAngle, setTargetAngle] = useState(null);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fallback to photo mode immediately if vehicle has no 3D model
  useEffect(() => {
    if (!has3D && renderMode === '3d') {
      setRenderMode('photo');
    }
  }, [has3D, renderMode]);

  const containerRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragAccumulatorRef = useRef(0);

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  const handleAngleUpdate = useCallback((deg) => {
    setAngle(deg);
  }, []);

  const handleAutoSpinChange = useCallback((spinning) => {
    setIsAutoSpinning(spinning);
  }, []);

  const handlePresetReached = useCallback(() => {
    setTargetAngle(null);
  }, []);

  const handleModelError = useCallback((err) => {
    setModel3dError(err?.message || '3D Model Error');
    setRenderMode('photo'); // Fall back to authentic photos immediately
  }, []);

  const requiredAssetInfo = useMemo(() => {
    return getRequired3DAssetInfo(vehicle || { name: vehicleName, category: vehicleType });
  }, [vehicle, vehicleName, vehicleType]);

  // ── 2. RESOLVE 2D AUTHENTIC VEHICLE PHOTOS (FROM VENDOR PORTAL) ──
  const frameList = useMemo(() => {
    const list = [];
    const addUrl = (u) => {
      if (!u || typeof u !== 'string') return;
      let clean = u.trim();
      if (clean && !list.includes(clean)) list.push(clean);
    };

    // First check vehicle object directly from vendor DB
    if (vehicle) {
      if (typeof vehicle.images_json === 'string') {
        try {
          const parsed = JSON.parse(vehicle.images_json);
          if (Array.isArray(parsed)) parsed.forEach(addUrl);
        } catch (e) {}
      } else if (Array.isArray(vehicle.images_json)) {
        vehicle.images_json.forEach(addUrl);
      }

      if (Array.isArray(vehicle.images)) vehicle.images.forEach(addUrl);
      addUrl(vehicle.image);
      addUrl(vehicle.image_url);
      addUrl(vehicle.imageUrl);
    }

    // Next check passed frames, angles, or images props
    if (Array.isArray(frames) && frames.length > 0) {
      frames.forEach(addUrl);
    } else if (angles && typeof angles === 'object') {
      const front = angles.front || angles['0'];
      const side = angles.side || angles.right || angles['90'];
      const rear = angles.rear || angles.back || angles['180'];
      const left = angles.left || angles['270'];
      [front, side, rear, left].forEach(addUrl);
    } else if (Array.isArray(images) && images.length > 0) {
      images.forEach(addUrl);
    }

    return list;
  }, [frames, angles, images, vehicle]);

  const frameCount = frameList.length;
  const currentImage = frameList[photoIndex % Math.max(frameCount, 1)] || frameList[0] || null;

  // Auto-Spin interval in photo mode
  useEffect(() => {
    if (renderMode !== 'photo' || !isAutoSpinning || frameCount <= 1) return;
    const interval = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % frameCount);
    }, 1800);
    return () => clearInterval(interval);
  }, [renderMode, isAutoSpinning, frameCount]);

  // Gyro Compass Heading Label
  const getAngleHeading = (deg) => {
    const d = ((deg % 360) + 360) % 360;
    if (d >= 337.5 || d < 22.5) return { label: 'Front View', sub: '0° Front' };
    if (d >= 22.5 && d < 67.5) return { label: 'Front Right', sub: '45° Quarter' };
    if (d >= 67.5 && d < 112.5) return { label: 'Right Side', sub: '90° Profile' };
    if (d >= 112.5 && d < 157.5) return { label: 'Rear Right', sub: '135° Rear 3/4' };
    if (d >= 157.5 && d < 202.5) return { label: 'Rear View', sub: '180° Back' };
    if (d >= 202.5 && d < 247.5) return { label: 'Rear Left', sub: '225° Rear 3/4' };
    if (d >= 247.5 && d < 292.5) return { label: 'Left Side', sub: '270° Profile' };
    return { label: 'Front Left', sub: '315° Quarter' };
  };

  const currentDegEstimate = useMemo(() => {
    if (renderMode === '3d') return angle;
    if (frameCount <= 1) return 0;
    return Math.round((photoIndex / frameCount) * 360);
  }, [renderMode, angle, photoIndex, frameCount]);

  const angleHeading = getAngleHeading(currentDegEstimate);

  // Fullscreen ESC handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ── 3. HORIZONTAL DRAG & TOUCH HANDLERS (PHOTO MODE) ──
  const handleDragStart = (clientX) => {
    if (renderMode !== 'photo') return;
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    dragAccumulatorRef.current = 0;
    setIsDragging(true);
    setIsAutoSpinning(false);
  };

  const handleDragMove = (clientX) => {
    if (renderMode !== 'photo' || !isDraggingRef.current || frameCount <= 1) return;
    const deltaX = clientX - dragStartXRef.current;
    dragStartXRef.current = clientX;
    dragAccumulatorRef.current += deltaX;

    const threshold = 35; // Pixels of drag to step photo
    if (dragAccumulatorRef.current >= threshold) {
      setPhotoIndex((prev) => (prev + 1) % frameCount);
      dragAccumulatorRef.current = 0;
    } else if (dragAccumulatorRef.current <= -threshold) {
      setPhotoIndex((prev) => (prev - 1 + frameCount) % frameCount);
      dragAccumulatorRef.current = 0;
    }
  };

  const handleDragEnd = () => {
    if (renderMode !== 'photo') return;
    isDraggingRef.current = false;
    dragAccumulatorRef.current = 0;
    setIsDragging(false);
  };

  // ── 4. RESOLVE VISIBLE ANGLES ──
  // For 3D mode: all 4 angles move camera
  const ALL_3D_ANGLES = useMemo(() => [
    { label: 'Front (0°)', deg: 0, keyName: 'Front' },
    { label: 'Side (90°)', deg: 90, keyName: 'Right Side' },
    { label: 'Rear (180°)', deg: 180, keyName: 'Rear' },
    { label: 'Left (270°)', deg: 270, keyName: 'Left Side' }
  ], []);

  // For Photo mode: ONLY show angles that have real uploaded photos
  const availablePhotoAngles = useMemo(() => {
    const resolvedAngles = angles || (vehicle ? (vehicle.angle_images || vehicle.angles) : null);
    if (resolvedAngles && typeof resolvedAngles === 'object') {
      const list = [];
      const front = resolvedAngles.front || resolvedAngles['0'];
      const side = resolvedAngles.side || resolvedAngles.right || resolvedAngles['90'];
      const rear = resolvedAngles.rear || resolvedAngles.back || resolvedAngles['180'];
      const left = resolvedAngles.left || resolvedAngles['270'];

      if (front) {
        const pIdx = frameList.indexOf(front);
        list.push({ label: 'Front (0°)', deg: 0, keyName: 'Front', photoIndex: pIdx >= 0 ? pIdx : 0 });
      }
      if (side) {
        const pIdx = frameList.indexOf(side);
        list.push({ label: 'Side (90°)', deg: 90, keyName: 'Right Side', photoIndex: pIdx >= 0 ? pIdx : 1 });
      }
      if (rear) {
        const pIdx = frameList.indexOf(rear);
        list.push({ label: 'Rear (180°)', deg: 180, keyName: 'Rear', photoIndex: pIdx >= 0 ? pIdx : 2 });
      }
      if (left) {
        const pIdx = frameList.indexOf(left);
        list.push({ label: 'Left (270°)', deg: 270, keyName: 'Left Side', photoIndex: pIdx >= 0 ? pIdx : (frameCount - 1) });
      }
      if (list.length > 0) return list;
    }

    if (frameCount <= 0) return [];
    if (frameCount === 1) {
      return [{ label: 'Front (0°)', deg: 0, keyName: 'Front', photoIndex: 0 }];
    }
    if (frameCount === 2) {
      return [
        { label: 'Side (90°)', deg: 90, keyName: 'Right Side', photoIndex: 1 },
        { label: 'Left (270°)', deg: 270, keyName: 'Left Side', photoIndex: 0 }
      ];
    }
    if (frameCount === 3) {
      return [
        { label: 'Front (0°)', deg: 0, keyName: 'Front', photoIndex: 0 },
        { label: 'Side (90°)', deg: 90, keyName: 'Right Side', photoIndex: 1 },
        { label: 'Left (270°)', deg: 270, keyName: 'Left Side', photoIndex: 2 }
      ];
    }
    return [
      { label: 'Front (0°)', deg: 0, keyName: 'Front', photoIndex: 0 },
      { label: 'Side (90°)', deg: 90, keyName: 'Right Side', photoIndex: Math.floor(frameCount * 0.25) },
      { label: 'Rear (180°)', deg: 180, keyName: 'Rear', photoIndex: Math.floor(frameCount * 0.50) },
      { label: 'Left (270°)', deg: 270, keyName: 'Left Side', photoIndex: Math.floor(frameCount * 0.75) }
    ];
  }, [angles, vehicle, frameList, frameCount]);

  const activeAngleButtons = (renderMode === '3d' && has3D) ? ALL_3D_ANGLES : availablePhotoAngles;

  // ── 5. ANGLE JUMP & PRESET CONTROLS ──
  const jumpToAngle = (targetDeg, keyName, targetPhotoIdx = null) => {
    setIsAutoSpinning(false);

    if (renderMode === '3d' && has3D) {
      setTargetAngle(targetDeg);
      showToast(`Aligning 3D camera to ${keyName} (${targetDeg}°)`);
      return;
    }

    // Photo Mode: Switch to the matching real vehicle photo
    if (typeof targetPhotoIdx === 'number' && targetPhotoIdx >= 0 && targetPhotoIdx < frameCount) {
      setPhotoIndex(targetPhotoIdx);
      showToast(`Showing ${keyName} photo`);
      return;
    }

    if (frameCount <= 1) {
      showToast(`Showing primary vehicle photo`);
      return;
    }

    const targetIdx = Math.round((targetDeg / 360) * frameCount) % frameCount;
    setPhotoIndex(targetIdx);
    showToast(`Showing ${keyName} photo`);
  };

  const handleReset = () => {
    setIsAutoSpinning(false);
    if (renderMode === '3d' && has3D) {
      setTargetAngle(0);
      showToast(`View reset to 0° Front View`);
    } else {
      setPhotoIndex(0);
      showToast(`Reset to primary vehicle photo`);
    }
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleStepRotate = (direction) => {
    setIsAutoSpinning(false);
    if (renderMode === '3d' && has3D) {
      const step = 45;
      const nextAngle = direction === 'cw' 
        ? (Math.floor((angle + step) / step) * step) % 360
        : (Math.ceil((angle - step) / step) * step + 360) % 360;
      setTargetAngle(nextAngle);
    } else if (frameCount > 1) {
      setPhotoIndex((prev) => direction === 'cw' ? (prev + 1) % frameCount : (prev - 1 + frameCount) % frameCount);
    } else {
      showToast(`Single photo available. Upload more angles in Vendor Portal for multi-photo spin.`);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.35, 2.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className={`vehicle-360-viewer-container position-relative overflow-hidden select-none w-100 ${
        isFullscreen ? 'position-fixed top-0 start-0 w-100 h-100' : 'rounded-4 border'
      }`}
      style={{
        height: isFullscreen ? '100vh' : (height || 'clamp(340px, 46vw, 460px)'),
        minHeight: isFullscreen ? '100vh' : '320px',
        maxHeight: isFullscreen ? '100vh' : '480px',
        zIndex: isFullscreen ? 1070 : 1,
        background: 'radial-gradient(ellipse at 50% 60%, #FFFFFF 0%, #F8FAFC 50%, #E2E8F0 100%)',
        boxShadow: isFullscreen ? 'none' : '0 10px 30px rgba(15, 23, 42, 0.08)',
        borderColor: '#E2E8F0'
      }}
    >
      {/* ─── 1. TOP AUTOMOTIVE HUD BAR ─── */}
      <div 
        className="position-absolute top-0 start-0 end-0 p-2.5 p-sm-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
        style={{ zIndex: 30, pointerEvents: 'none' }}
      >
        {/* Left: Asset State Badge & Vehicle Name & View Mode Switcher */}
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ pointerEvents: 'auto' }}>
          {renderMode === 'photo' ? (
            <div 
              className="badge rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 shadow-sm text-xs fw-bold border"
              style={{ 
                background: '#0F172A', 
                color: '#FFFFFF',
                borderColor: '#1E293B',
                letterSpacing: '0.4px'
              }}
            >
              <Camera size={13} className="text-warning flex-shrink-0" />
              <span>PHOTO GALLERY</span>
              <span className="badge bg-warning text-dark ms-1 py-0.5 px-1.5 rounded-pill text-xxs">
                AUTHENTIC
              </span>
            </div>
          ) : (
            <div 
              className="badge rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 shadow-sm text-xs fw-bold"
              style={{ 
                background: 'linear-gradient(135deg, #FF6333 0%, #FF8A00 100%)', 
                color: '#FFFFFF',
                letterSpacing: '0.4px'
              }}
            >
              <Box size={13} className={isAutoSpinning ? 'spin-anim' : ''} />
              <span>3D STUDIO VIEW</span>
              <span className="badge bg-white text-dark ms-1 py-0.5 px-1.5 rounded-pill text-xxs">
                GLB 360° MODEL
              </span>
            </div>
          )}

          {/* Mode Switcher Toggle Pill (If genuine 3D model is available) */}
          {has3D && (
            <div className="d-flex align-items-center p-0.5 bg-white rounded-pill border shadow-xs">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2.5 py-0.5 text-xxs fw-bold transition-all ${
                  renderMode === '3d' 
                    ? 'btn-warning text-white' 
                    : 'text-secondary bg-transparent border-0'
                }`}
                onClick={() => setRenderMode('3d')}
                title="View interactive 3D WebGL model"
              >
                🎮 3D Model
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2.5 py-0.5 text-xxs fw-bold transition-all ${
                  renderMode === 'photo' 
                    ? 'btn-dark text-white' 
                    : 'text-secondary bg-transparent border-0'
                }`}
                onClick={() => setRenderMode('photo')}
                title="View authentic photo gallery"
              >
                📸 Photo Gallery
              </button>
            </div>
          )}

          <span className="badge bg-white text-dark border shadow-xs text-xxs fw-bold d-none d-md-inline-block">
            {vehicleName}
          </span>
        </div>

        {/* Right: Gyro Compass HUD, Reset, Zoom & Fullscreen Toggle */}
        <div className="d-flex align-items-center gap-1.5" style={{ pointerEvents: 'auto' }}>
          {/* Compass / Photo Indicator */}
          <div 
            className="d-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill bg-white border shadow-xs"
            style={{ fontSize: '11px', fontWeight: 700 }}
          >
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 18,
                height: 18,
                background: '#FFF3ED',
                color: '#FF6333',
                transform: `rotate(${Math.round(currentDegEstimate)}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
            >
              <Compass size={13} />
            </div>
            <span className="text-dark fw-black">{Math.round(currentDegEstimate)}°</span>
            <span className="text-muted d-none d-sm-inline">
              | {renderMode === 'photo' && frameCount > 1 ? `Photo ${photoIndex + 1}/${frameCount} (${angleHeading.label})` : angleHeading.label}
            </span>
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            className="btn btn-sm btn-white bg-white border rounded-circle shadow-xs p-1.5 text-secondary hover-scale"
            onClick={handleReset}
            title={renderMode === '3d' ? "Reset to 0° Front View" : "Reset Photo View"}
          >
            <RefreshCw size={14} />
          </button>

          {/* Zoom controls */}
          {zoomLevel > 1 ? (
            <button
              type="button"
              className="btn btn-sm btn-warning bg-warning border-0 rounded-circle shadow-xs p-1.5 text-dark hover-scale"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <ZoomOut size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-white bg-white border rounded-circle shadow-xs p-1.5 text-secondary hover-scale"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            className="btn btn-sm btn-white bg-white border rounded-circle shadow-xs p-1.5 text-secondary hover-scale"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {onClose && (
            <button
              type="button"
              className="btn btn-sm btn-light border rounded-circle shadow-xs p-1.5 text-dark hover-scale"
              onClick={onClose}
              title="Close View"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. TEMPORARY STATUS TOAST (HUD NOTIFICATIONS) ─── */}
      {toastMessage && (
        <div 
          className="position-absolute start-50 translate-middle-x px-3 py-1.5 rounded-pill shadow-lg text-white text-xs fw-semibold d-flex align-items-center gap-1.5"
          style={{ 
            top: '56px', 
            zIndex: 40, 
            animation: 'toastFadeIn 0.2s ease-out',
            background: 'rgba(11, 25, 44, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            pointerEvents: 'none'
          }}
        >
          <AlertCircle size={14} className="text-warning flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 3. SHOWROOM STAGE VIEW (REAL PHOTO OR 3D WEBGL) ─── */}
      <div 
        className="w-100 h-100 position-relative"
        style={{
          paddingTop: '46px',
          paddingBottom: '60px',
          boxSizing: 'border-box'
        }}
      >
        {renderMode === '3d' && has3D ? (
          /* 3D WEBGL VEHICLE VIEWER */
          <ThreeVehicleViewer
            modelUrl={active3DModel.url}
            vehicleName={vehicleName}
            vehicleType={active3DModel.vehicleType || vehicleType}
            isAutoSpinning={isAutoSpinning}
            onAutoSpinChange={handleAutoSpinChange}
            onAngleUpdate={handleAngleUpdate}
            frontOffsetDeg={active3DModel.frontOffsetDeg ?? 0}
            targetPresetDeg={targetAngle}
            onPresetReached={handlePresetReached}
            zoomLevel={zoomLevel}
            isFullscreen={isFullscreen}
            onError={handleModelError}
          />
        ) : (
          /* AUTHENTIC VENDOR PORTAL PHOTO SHOWROOM TURNTABLE */
          <div 
            className="w-100 h-100 d-flex align-items-center justify-content-center position-relative"
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => e.touches[0] && handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => e.touches[0] && handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
            style={{ 
              cursor: frameCount > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none'
            }}
          >
            {!currentImage ? (
              <div className="text-center text-muted p-4">
                <ImageIcon size={48} className="mb-2 opacity-50" />
                <p className="fw-semibold mb-1">No Vehicle Photos Uploaded</p>
                <p className="text-xs">Upload real photos in the Vendor Portal to enable 360° showroom view.</p>
              </div>
            ) : (
              <div 
                className="position-relative d-flex align-items-center justify-content-center w-100 h-100"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                <img 
                  src={currentImage} 
                  alt={vehicleName}
                  className="img-fluid select-none"
                  draggable={false}
                  style={{
                    maxHeight: isFullscreen ? '75vh' : 'clamp(210px, 32vw, 290px)',
                    maxWidth: '88%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 22px 28px rgba(15, 23, 42, 0.22)) drop-shadow(0 4px 10px rgba(0,0,0,0.12))',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    transition: 'opacity 0.15s ease'
                  }}
                />

                {/* Ground Shadow on Turntable Floor */}
                <div 
                  className="position-absolute start-50 translate-middle-x"
                  style={{
                    bottom: '10px',
                    width: '75%',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.12) 50%, transparent 75%)',
                    filter: 'blur(5px)',
                    zIndex: -1,
                    pointerEvents: 'none'
                  }}
                />

                {/* Next/Previous Arrows for Multi-Photo Vehicles */}
                {frameCount > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-white bg-white border rounded-circle shadow-sm position-absolute start-0 ms-3 p-1.5 text-dark hover-scale"
                      style={{ zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIndex((p) => (p - 1 + frameCount) % frameCount);
                      }}
                      title="Previous Photo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-white bg-white border rounded-circle shadow-sm position-absolute end-0 me-3 p-1.5 text-dark hover-scale"
                      style={{ zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIndex((p) => (p + 1) % frameCount);
                      }}
                      title="Next Photo"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 4. STATUS BANNER & GESTURE INSTRUCTION ─── */}
      <div 
        className="position-absolute start-50 translate-middle-x text-center w-100 px-3"
        style={{ bottom: '66px', pointerEvents: 'none', zIndex: 26 }}
      >
        <span 
          className="badge bg-white bg-opacity-95 text-dark border shadow-xs rounded-pill px-3 py-1 text-xxs fw-semibold"
          style={{ letterSpacing: '0.2px', pointerEvents: 'auto' }}
        >
          {renderMode === 'photo' 
            ? (frameCount > 1 
                ? `📸 Swipe to browse photos (${photoIndex + 1} of ${frameCount})`
                : `📸 Photo Gallery (${photoIndex + 1} of ${frameCount || 1})`)
            : `🔄 Drag horizontally to spin 360° continuously | Pitch vertically to inspect elevations`}
        </span>
      </div>

      {/* ─── 5. BOTTOM CONTROL CONSOLE ─── */}
      <div 
        className="position-absolute bottom-0 start-0 end-0 p-2 p-sm-2.5 bg-white bg-opacity-95 border-top d-flex flex-wrap align-items-center justify-content-between gap-1.5 gap-sm-2"
        style={{ zIndex: 28, backdropFilter: 'blur(8px)', borderColor: '#E2E8F0' }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Play/Pause Auto-Spin Button & Step Rotators */}
        <div className="d-flex align-items-center gap-1.5">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 text-xs fw-bold transition-all shadow-xs ${
              isAutoSpinning 
                ? 'btn-danger text-white' 
                : 'btn-dark text-white'
            }`}
            onClick={() => {
              if (renderMode === 'photo' && frameCount <= 1) {
                showToast(`Single photo available. Upload multiple photos in Vendor Portal for multi-angle spin.`);
                return;
              }
              setIsAutoSpinning(!isAutoSpinning);
            }}
            title={isAutoSpinning ? "Pause Auto Spin" : "Start Auto 360° Spin"}
          >
            {isAutoSpinning ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            <span>
              {isAutoSpinning ? 'Pause Spin' : 'Auto 360° Spin'}
            </span>
          </button>

          {/* Step Rotate Left/Right Buttons */}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-circle p-1.5 hover-scale"
            onClick={() => handleStepRotate('ccw')}
            title="Previous Angle / Photo"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-circle p-1.5 hover-scale"
            onClick={() => handleStepRotate('cw')}
            title="Next Angle / Photo"
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Cardinal Angle Controls: Filtered to angles that have real uploaded photos (or all 4 for 3D) */}
        {activeAngleButtons.length > 0 && (
          <div className="d-flex align-items-center gap-1 flex-wrap">
            <span className="text-muted text-xxs fw-semibold me-1 d-none d-md-inline">Angles:</span>
            {activeAngleButtons.map((preset) => {
              const isMatch = renderMode === '3d'
                ? Math.abs((((angle % 360) + 360) % 360) - preset.deg) < 25
                : (typeof preset.photoIndex === 'number' 
                    ? photoIndex === preset.photoIndex 
                    : (frameCount > 1 && Math.abs(currentDegEstimate - preset.deg) < 45));

              return (
                <button
                  key={`${preset.deg}-${preset.label}`}
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-1 text-xxs fw-bold transition-all position-relative ${
                    isMatch ? 'btn-warning text-white shadow-xs' : 'btn-light border text-secondary'
                  }`}
                  style={isMatch ? { background: '#FF6333', borderColor: '#FF6333', color: '#FFFFFF' } : {}}
                  onClick={() => jumpToAngle(preset.deg, preset.keyName, preset.photoIndex)}
                  title={`View ${preset.keyName} (${preset.deg}°)`}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}

            {/* Quick Fallback Gallery Switch Button */}
            {onSwitchToGallery && (
              <button
                type="button"
                className="btn btn-sm btn-outline-dark rounded-pill px-2.5 py-1 text-xxs fw-bold ms-1"
                onClick={onSwitchToGallery}
                title="Open full photo gallery"
              >
                📸 Gallery
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style>{`
        .spin-anim {
          animation: spin360 2.2s linear infinite;
        }
        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .hover-scale:hover {
          transform: scale(1.08);
          transition: transform 0.15s ease;
        }
      `}</style>
    </div>
  );
}
