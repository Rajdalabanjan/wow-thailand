import React, { useMemo, useState } from 'react';
import { 
  ArrowLeft, Star, MapPin, Users, Fuel, Settings, ShieldCheck, 
  CheckCircle, ChevronRight, Wind, AlertCircle, PhoneCall, FileText, 
  Clock, Award, Car as CarIcon, Sparkles, X, Calendar, RotateCw
} from 'lucide-react';
import ImageCarousel from '../../components/common/ImageCarousel';

/**
 * CarDetailsPage
 * Dedicated information and review page for Self-Drive Rental Cars.
 * Displays comprehensive vehicle specifications, live availability,
 * driver options, rental terms, and connects seamlessly to the existing booking flow.
 */
export default function CarDetailsPage({
  car,
  pickupDate,
  dropDate,
  bookingDays = 2,
  onBack,
  onBook,
  backLabel,
  actionLabel,
  breadcrumbPrefix,
  memberCount,
  onMemberCountChange,
  isCraftMyTrip = false
}) {
  const [capacityError, setCapacityError] = useState(null);

  // 1. Calculate rental days and dynamic pricing
  const pricePerDay = Math.round(parseFloat(car?.price || 1500));
  const originalPricePerDay = Math.round(pricePerDay * 1.25); // 25% strikethrough

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [currentPickupDate, setCurrentPickupDate] = useState(() => {
    return pickupDate || todayStr;
  });

  const [currentDropDate, setCurrentDropDate] = useState(() => {
    if (dropDate) return dropDate;
    const base = new Date(pickupDate || todayStr);
    base.setDate(base.getDate() + (bookingDays || 2));
    return base.toISOString().split('T')[0];
  });

  const initialDays = useMemo(() => {
    if (currentPickupDate && currentDropDate) {
      const diff = Math.round((new Date(currentDropDate) - new Date(currentPickupDate)) / (1000 * 60 * 60 * 24));
      if (diff > 0) return diff;
    }
    return bookingDays || 2;
  }, [currentPickupDate, currentDropDate, bookingDays]);

  // Interactive duration selection
  const [selectedDuration, setSelectedDuration] = useState(initialDays);

  const effectiveDays = selectedDuration || initialDays || 1;

  // Handlers for interactive calendar pickers & duration buttons
  const handlePickupDateChange = (newPickup) => {
    if (!newPickup) return;
    setCurrentPickupDate(newPickup);
    if (!currentDropDate || currentDropDate <= newPickup) {
      const d = new Date(newPickup);
      d.setDate(d.getDate() + effectiveDays);
      setCurrentDropDate(d.toISOString().split('T')[0]);
    } else {
      const diff = Math.round((new Date(currentDropDate) - new Date(newPickup)) / (1000 * 60 * 60 * 24));
      setSelectedDuration(Math.max(1, diff));
    }
  };

  const handleDropDateChange = (newDrop) => {
    if (!newDrop) return;
    setCurrentDropDate(newDrop);
    const diff = Math.round((new Date(newDrop) - new Date(currentPickupDate)) / (1000 * 60 * 60 * 24));
    setSelectedDuration(Math.max(1, diff));
  };

  const handleDurationClick = (days) => {
    setSelectedDuration(days);
    const d = new Date(currentPickupDate || todayStr);
    d.setDate(d.getDate() + days);
    setCurrentDropDate(d.toISOString().split('T')[0]);
  };

  // Multi-day discount incentive (5% off for 4-6 days, 10% off for 7+ days)
  const discountPercent = effectiveDays >= 7 ? 0.10 : (effectiveDays >= 4 ? 0.05 : 0);
  const rawRentalTotal = pricePerDay * effectiveDays;
  const discountAmount = Math.round(rawRentalTotal * discountPercent);
  const baseRentalTotal = rawRentalTotal - discountAmount;
  const gstAmount = Math.round(baseRentalTotal * 0.18);
  const estimatedTotal = baseRentalTotal + gstAmount;

  // 2. Resolve vehicle-specific photos
  const carImages = useMemo(() => {
    const list = [];
    if (car?.images_json) {
      try {
        const parsed = typeof car.images_json === 'string' ? JSON.parse(car.images_json) : car.images_json;
        if (Array.isArray(parsed)) parsed.forEach(img => { if (img && typeof img === 'string' && !list.includes(img.trim())) list.push(img.trim()); });
      } catch (e) {}
    }
    if (Array.isArray(car?.images)) {
      car.images.forEach(img => { if (img && typeof img === 'string' && !list.includes(img.trim())) list.push(img.trim()); });
    }
    if (car?.image && typeof car.image === 'string' && !list.includes(car.image.trim())) list.push(car.image.trim());
    if (car?.image_url && typeof car.image_url === 'string' && !list.includes(car.image_url.trim())) list.push(car.image_url.trim());
    return list.length > 0 ? list : (car?.image ? [car.image] : []);
  }, [car]);

  if (!car) return null;

  const isAvailable = car.is_available === 1 || car.is_available === true || car.is_available === '1' || car.is_available === undefined;
  const ratingVal = parseFloat(car.rating || 4.8);
  const seatingCapacity = parseInt(car?.seating, 10) || 4;

  const depositAmount = car?.security_deposit !== undefined && car?.security_deposit !== null && car?.security_deposit !== '' 
    ? Number(car.security_deposit) 
    : 3000;
  const kmAllowance = car?.km_limit || 'Unlimited Kilometres';
  const fuelRule = car?.fuel_policy || 'Same-to-Same';
  const hasAc = car?.has_ac === 0 || car?.has_ac === false || car?.has_ac === '0' ? false : true;
  const hasFastag = car?.has_fastag === 0 || car?.has_fastag === false || car?.has_fastag === '0' ? false : true;
  const luggageCap = car?.luggage_capacity || '2 Large Bags + 2 Hand Bags';
  const permitLabel = car?.permit_type || 'Commercial Self-Drive (Black Plate)';
  const deliveryLocations = car?.delivery_options || 'Thailand Airports (Don Mueang/Suvarnabhumi), Railway Stations & Hotel Handover';

  const modelYear = car?.model_year || 2024;
  const donMueangFee = car?.don_mueang_delivery_fee !== undefined && car?.don_mueang_delivery_fee !== null ? Number(car.don_mueang_delivery_fee) : 800;
  const SuvarnabhumiFee = car?.Suvarnabhumi_delivery_fee !== undefined && car?.Suvarnabhumi_delivery_fee !== null ? Number(car.Suvarnabhumi_delivery_fee) : 600;
  const doorstepFee = car?.doorstep_delivery_fee !== undefined && car?.doorstep_delivery_fee !== null ? Number(car.doorstep_delivery_fee) : 300;
  const extraKmRate = car?.extra_km_rate !== undefined && car?.extra_km_rate !== null ? Number(car.extra_km_rate) : 12;
  const lateReturnFee = car?.late_return_fee_per_hour !== undefined && car?.late_return_fee_per_hour !== null ? Number(car.late_return_fee_per_hour) : 150;
  const minBookingDays = car?.min_booking_days || 1;
  const hasCarPlay = car?.has_carplay_android_auto == 1 || car?.has_carplay_android_auto === true || car?.has_carplay_android_auto === '1';
  const hasReverseCam = car?.has_reverse_camera == 1 || car?.has_reverse_camera === true || car?.has_reverse_camera === '1';
  const hasUsb = car?.has_usb_charging == 1 || car?.has_usb_charging === true || car?.has_usb_charging === '1';

  const handleBookNowClick = () => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (isCraftMyTrip && memberCount && memberCount > seatingCapacity) {
      setCapacityError(`This vehicle accommodates up to ${seatingCapacity} passengers. Please choose another vehicle or reduce the number of members.`);
      return;
    }
    setCapacityError(null);
    if (onBook) {
      onBook({
        ...car,
        booking_days: effectiveDays,
        bookingDays: effectiveDays,
        pickupDate: currentPickupDate,
        dropDate: currentDropDate,
        total_price: estimatedTotal,
        estimatedTotal: estimatedTotal
      });
    }
  };

  return (
    <div className="car-details-page animate-fade-in w-100" style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: '80px', width: '100%' }}>
      
      {/* ─── 1. TOP STICKY NAVBAR ─── */}
      <div 
        className="bg-white border-bottom sticky-top shadow-sm px-4 py-3 d-flex align-items-center justify-content-between"
        style={{ zIndex: 1020 }}
      >
        <div className="d-flex align-items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              if (document.activeElement?.blur) document.activeElement.blur();
              onBack();
            }}
            className={`btn btn-light border hover-scale d-flex align-items-center gap-1.5 ${
              backLabel ? 'rounded-pill px-3 py-1.5 fw-bold text-xs' : 'rounded-circle p-2 justify-content-center'
            }`}
            title={backLabel || "Back to Car Listings"}
          >
            <ArrowLeft size={16} />
            {backLabel && <span>{backLabel.replace(/^←\s*/, '')}</span>}
          </button>
          <div>
            <div className="text-muted text-xxs text-uppercase fw-semibold" style={{ letterSpacing: '0.5px' }}>
              {breadcrumbPrefix || 'Self-Drive Rental Cars'} &gt; {car.category || 'Thailand'} &gt; {car.name}
            </div>
            <h5 className="mb-0 fw-bold text-dark font-heading">{car.name}</h5>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button 
            type="button"
            onClick={handleBookNowClick}
            className="btn btn-warning text-dark btn-sm rounded-pill px-3.5 py-1.5 fw-bold d-none d-md-flex align-items-center gap-1.5 shadow-sm font-heading hover-scale"
            style={{ background: '#FF6333', borderColor: '#FF6333', color: '#FFFFFF' }}
          >
            <span>{actionLabel || 'Book Now'}</span>
            <ChevronRight size={15} />
          </button>
          <button 
            type="button"
            onClick={() => {
              if (document.activeElement?.blur) document.activeElement.blur();
              onBack();
            }}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 rounded-pill px-3 py-1"
          >
            <X size={15} /> Close
          </button>
        </div>
      </div>

      <div className="container-xl px-3 px-md-4 py-3 py-md-4" style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ─── 2. CAR HEADER & HIGHLIGHTS ─── */}
        <div className="bg-white rounded-4 shadow-sm p-3 p-md-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span className="badge rounded-pill px-3 py-1 text-xs fw-bold" style={{ background: '#0B192C', color: '#FFFFFF' }}>
                  🚗 {car.category || 'Self-Drive Car'}
                </span>
                <span className="badge rounded-pill px-2.5 py-1 text-xxs fw-bold" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                  ✨ {modelYear} Model
                </span>
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2.5 py-1 text-xxs fw-bold">
                  ✓ WOW THAILAND Certified Fleet
                </span>
                {minBookingDays > 1 && (
                  <span className="badge rounded-pill px-2.5 py-1 text-xxs fw-bold" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                    ⏳ Min {minBookingDays} Days
                  </span>
                )}
                {car.badge && (
                  <span
                    className="badge rounded-pill px-2.5 py-1 text-xxs fw-bold"
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#B45309',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    ★ {car.badge}
                  </span>
                )}
                {isAvailable ? (
                  <span className="badge bg-success text-white rounded-pill px-2.5 py-1 text-xxs fw-bold">
                    ● Instant Confirmation
                  </span>
                ) : (
                  <span className="badge bg-secondary text-white rounded-pill px-2.5 py-1 text-xxs fw-bold">
                    On Request
                  </span>
                )}
              </div>

              <h1 className="fw-black text-dark mb-1 fs-2 font-heading tracking-tight">{car.name}</h1>
              
              <div className="d-flex align-items-center gap-3 text-muted text-sm flex-wrap mt-2">
                <div className="d-flex align-items-center gap-1">
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  <span className="fw-bold text-dark">{ratingVal.toFixed(1)}</span>
                  <span className="text-muted text-xs">(Verified Rental Host)</span>
                </div>
                <span>•</span>
                <div className="d-flex align-items-center gap-1">
                  <MapPin size={15} className="text-warning" />
                  <span>{car.location || 'All Thailand Delivery (Airport, Railway Station & Hotels)'}</span>
                </div>
              </div>
            </div>

            {/* Quick Price Badge */}
            <div className="d-flex flex-column align-items-start align-items-md-end bg-light p-3 rounded-3 border flex-shrink-0" style={{ minWidth: '220px' }}>
              <span className="text-muted text-xxs text-uppercase fw-bold">Daily Rental Rate</span>
              <div className="d-flex align-items-baseline gap-1">
                <span className="text-decoration-line-through text-muted text-xs">฿{originalPricePerDay.toLocaleString('en-US')}</span>
                <h3 className="fw-black text-primary mb-0 font-heading" style={{ fontSize: '26px' }}>฿{pricePerDay.toLocaleString('en-US')}</h3>
                <span className="text-muted text-xs">/ day</span>
              </div>
              <span className="text-success text-xxs fw-bold mt-0.5">Includes Unlimited Kilometres</span>
            </div>
          </div>
        </div>

        {/* ─── 3. VEHICLE GALLERY ─── */}
        <div className="bg-white rounded-4 shadow-sm p-2.5 p-md-3.5 mb-4 border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
          <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-dark text-white rounded-pill px-3 py-1 text-xs fw-bold">
                📸 Photo Gallery
              </span>
              <span className="text-muted text-xs fw-medium">
                {carImages.length} authentic exterior &amp; interior photos
              </span>
            </div>
            <span className="text-muted text-xxs d-none d-sm-inline">
              Click any photo to zoom fullscreen
            </span>
          </div>

          {carImages.length > 0 ? (
            <ImageCarousel
              images={carImages}
              alt={car.name}
              height="clamp(320px, 44vw, 440px)"
              rounded="16px"
            />
          ) : (
            <div
              className="d-flex flex-column align-items-center justify-content-center text-muted"
              style={{ height: 'clamp(260px, 40vw, 380px)', background: '#F8FAFC', borderRadius: '16px' }}
            >
              <CarIcon size={48} className="text-secondary opacity-50 mb-2" />
              <span className="fw-semibold">No vehicle photos available</span>
            </div>
          )}
        </div>

        {/* ─── 4. MAIN CONTENT ROW (SPECS, OPTIONS & SIDEBAR) ─── */}
        <div className="row g-3 g-md-4">
          
          {/* Left Column: Specifications & Rental Policies */}
          <div className="col-12 col-lg-8">

            {/* Rental Highlights & Trust Badges */}
            <div className="bg-white rounded-4 shadow-sm p-3.5 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <div className="row g-2.5">
                <div className="col-6 col-md-3">
                  <div className="p-2.5 rounded-3 bg-light border text-center h-100 d-flex flex-column justify-content-center align-items-center">
                    <span className="fs-5 mb-1">{hasAc ? '❄️' : '💨'}</span>
                    <span className="text-muted text-xxs text-uppercase fw-bold">Air Conditioning</span>
                    <span className="fw-bold text-dark text-xs">{hasAc ? 'Powerful AC' : 'Non-AC'}</span>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="p-2.5 rounded-3 bg-light border text-center h-100 d-flex flex-column justify-content-center align-items-center">
                    <span className="fs-5 mb-1">💰</span>
                    <span className="text-muted text-xxs text-uppercase fw-bold">Security Deposit</span>
                <span className="fw-bold text-success text-xs">฿0 (Zero Deposit)</span>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="p-2.5 rounded-3 bg-light border text-center h-100 d-flex flex-column justify-content-center align-items-center">
                    <span className="fs-5 mb-1">🛣️</span>
                    <span className="text-muted text-xxs text-uppercase fw-bold">KM Limit</span>
                    <span className="fw-bold text-dark text-xs">{kmAllowance}</span>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="p-2.5 rounded-3 bg-light border text-center h-100 d-flex flex-column justify-content-center align-items-center">
                    <span className="fs-5 mb-1">🛡️</span>
                    <span className="text-muted text-xxs text-uppercase fw-bold">Thailand Permit</span>
                    <span className="fw-bold text-dark text-xs">{permitLabel.includes('Black') ? 'Black Plate Legal' : 'Verified Permit'}</span>
                  </div>
                </div>
              </div>

              {/* Extra amenity tags */}
              <div className="d-flex flex-wrap gap-2 pt-3 mt-3 border-top text-xs">
                {hasCarPlay && (
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                    📱 Apple CarPlay / Android Auto
                  </span>
                )}
                {hasReverseCam && (
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                    📷 Reverse Camera
                  </span>
                )}
                {hasUsb && (
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                    🔌 USB Fast Charging
                  </span>
                )}
                {hasFastag && (
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                    ⚡ FASTag Toll Enabled
                  </span>
                )}
                <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                  🧳 {luggageCap}
                </span>
                <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                  ⛽ {fuelRule} Fuel Policy
                </span>
                <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1">
                  ✈️ {deliveryLocations}
                </span>
              </div>
            </div>

            {/* Airport & Doorstep Delivery Charges */}
            <div className="bg-white rounded-4 shadow-sm p-3.5 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <div className="d-flex align-items-center justify-content-between mb-2.5">
                <h6 className="fw-bold text-dark font-heading mb-0 d-flex align-items-center gap-2">
                  <span>✈️</span> Thailand Airport &amp; Doorstep Delivery Options
                </h6>
                <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '10px' }}>Direct Handover</span>
              </div>
              <div className="row g-2">
                <div className="col-12 col-sm-4">
                  <div className="p-2.5 rounded-3 bg-light border text-center">
                    <div className="text-muted text-xxs fw-bold text-uppercase">Don Mueang Airport (DMK)</div>
                    <div className="fw-bold text-dark fs-6 mt-0.5">฿{donMueangFee}</div>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Direct terminal handover</span>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="p-2.5 rounded-3 bg-light border text-center">
                    <div className="text-muted text-xxs fw-bold text-uppercase">Suvarnabhumi Airport (BKK)</div>
                    <div className="fw-bold text-dark fs-6 mt-0.5">฿{SuvarnabhumiFee}</div>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Arrival exit pickup</span>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="p-2.5 rounded-3 bg-light border text-center">
                    <div className="text-muted text-xxs fw-bold text-uppercase">Hotel / Villa Doorstep</div>
                    <div className="fw-bold text-dark fs-6 mt-0.5">฿{doorstepFee}</div>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Anywhere in Thailand</span>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between pt-2.5 mt-2.5 border-top text-xs text-muted flex-wrap gap-2">
                <span>🛣️ Extra KM Rate: <strong>฿{extraKmRate}/km</strong> after allowance</span>
                <span>⏱️ Late Return Fee: <strong>฿{lateReturnFee}/hr</strong></span>
              </div>
            </div>

            {/* Vehicle Specifications Grid */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <CarIcon size={20} className="text-warning" />
                Vehicle Specifications
              </h5>

              <div className="row g-3">
                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <Users className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Seating Capacity</span>
                    <span className="fw-bold text-dark fs-6 mt-1">{car.seating || '5 Seater'}</span>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <Settings className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Transmission</span>
                    <span className="fw-bold text-dark fs-6 mt-1">{car.transmission || 'Manual'}</span>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <Fuel className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Fuel Type</span>
                    <span className="fw-bold text-dark fs-6 mt-1">{car.fuel || 'Petrol'}</span>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <Wind className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Air Conditioning</span>
                    <span className="fw-bold text-dark fs-6 mt-1">{hasAc ? 'Chilled AC' : 'Non-AC'}</span>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <Sparkles className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Fuel Economy</span>
                    <span className="fw-bold text-dark fs-6 mt-1">{car.mileage || 'Standard Mileage'}</span>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="border rounded-3 p-3 text-center bg-light h-100 d-flex flex-column justify-content-center">
                    <ShieldCheck className="text-primary mb-1.5 mx-auto" size={24} />
                    <span className="text-muted text-xxs text-uppercase fw-bold">Insurance Status</span>
                    <span className="fw-bold text-dark fs-6 mt-1">Comprehensive Included</span>
                  </div>
                </div>
              </div>
            </div>

            {/* How Renting Works: 3 Simple Steps */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <Clock size={20} className="text-primary" />
                How Your Chauffeur Transfer Works in Thailand
              </h5>

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border h-100 position-relative">
                    <span className="badge bg-primary text-white rounded-circle p-2 fw-bold d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '28px', height: '28px' }}>
                      1
                    </span>
                    <h6 className="fw-bold text-dark mb-1">Book &amp; Lock Dates</h6>
                    <p className="text-muted text-xs mb-0">
                      Reserve online with instant confirmation. Host details &amp; pickup coordination are sent to your WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border h-100 position-relative">
                    <span className="badge bg-primary text-white rounded-circle p-2 fw-bold d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '28px', height: '28px' }}>
                      2
                    </span>
                    <h6 className="fw-bold text-dark mb-1">Terminal Meet &amp; Greet</h6>
                    <p className="text-muted text-xs mb-0">
                      Meet your professional chauffeur at Airport arrivals (Suvarnabhumi BKK / Don Mueang DMK / Phuket HKT) holding your name placard, with flight delay tracking included.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-3 bg-light border h-100 position-relative">
                    <span className="badge bg-success text-white rounded-circle p-2 fw-bold d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '28px', height: '28px' }}>
                      3
                    </span>
                    <h6 className="fw-bold text-dark mb-1">Comfortable Chauffeur Ride</h6>
                    <p className="text-muted text-xs mb-0">
                      Relax in air-conditioned comfort with complimentary bottled water, tollway tolls included, and safe door-to-door drop-off.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Handover Document Checklist */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <ShieldCheck size={20} className="text-success" />
                Guest Boarding &amp; Identification Guidelines
              </h5>

              <div className="row g-3 text-xs">
                <div className="col-12 col-md-6">
                  <div className="d-flex align-items-start gap-2.5 p-2.5 rounded-3 bg-light border">
                    <CheckCircle size={18} className="text-success mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-dark d-block">Digital Booking Voucher</strong>
                      <span className="text-muted">Present your confirmed WOW Thailand booking voucher on mobile or printed copy to your chauffeur.</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="d-flex align-items-start gap-2.5 p-2.5 rounded-3 bg-light border">
                    <CheckCircle size={18} className="text-success mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-dark d-block">Government Photo ID</strong>
                      <span className="text-muted">Valid Passport or National Photo ID matching the voucher name for passenger verification.</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="d-flex align-items-start gap-2.5 p-2.5 rounded-3 bg-light border">
                    <CheckCircle size={18} className="text-success mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-dark d-block">Professional Thai Driver Included</strong>
                      <span className="text-muted">No driving required—your trip is driven by a licensed, vetted local chauffeur with commercial insurance.</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="d-flex align-items-start gap-2.5 p-2.5 rounded-3 bg-light border">
                    <CheckCircle size={18} className="text-success mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-dark d-block">Zero Security Deposit Required</strong>
                      <span className="text-muted">Zero deposit or credit card pre-authorization required since professional chauffeur is included.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Options & Information */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <Users size={20} className="text-warning" />
                Driver Options &amp; Rental Mode
              </h5>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="border rounded-3 p-3 bg-light h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-primary text-white rounded-pill px-2 py-1 text-xxs fw-bold">Primary</span>
                      <h6 className="fw-bold mb-0 text-dark">Customer Self-Drive</h6>
                    </div>
                    <p className="text-muted text-xs mb-2">
                      You drive the vehicle independently Across Thailand. Enjoy complete privacy and freedom with unlimited kilometres.
                    </p>
                    <div className="d-flex align-items-center gap-1 text-success text-xs fw-semibold">
                      <CheckCircle size={14} /> Valid Driving License required at pickup
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="border rounded-3 p-3 bg-light h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-secondary text-white rounded-pill px-2 py-1 text-xxs fw-bold">Optional</span>
                      <h6 className="fw-bold mb-0 text-dark">With Driver / Chauffeur</h6>
                    </div>
                    <p className="text-muted text-xs mb-2">
                      Want to relax? A verified, professional local Thai chauffeur can be arranged upon request at standard daily allowance.
                    </p>
                    <div className="d-flex align-items-center gap-1 text-muted text-xs">
                      <PhoneCall size={14} className="text-primary" /> Request directly during checkout or upon delivery
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Inclusions & Features */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <Award size={20} className="text-warning" />
                Included Features &amp; Amenities
              </h5>

              <div className="row g-2.5">
                {[
                  hasAc ? 'Powerful Climate Control Air Conditioning' : 'Standard Ventilation System',
                  'Bluetooth & USB Music Entertainment System',
                  'Dual Front Airbags & ABS Safety Braking',
                  'Power Steering with Smooth Handling',
                  'Power Windows & Central Remote Locking',
                  'Clean, Deep-Sanitized Interior Before Every Rental',
                  'Spare Tyre, Jack & Emergency Tool Kit Included',
                  '24/7 Breakdown & Roadside Assistance Across Thailand'
                ].map((feat, fIdx) => (
                  <div key={fIdx} className="col-12 col-sm-6">
                    <div className="d-flex align-items-center gap-2 p-2 rounded-2 bg-light text-xs">
                      <CheckCircle size={15} className="text-success flex-shrink-0" />
                      <span className="text-dark fw-medium">{feat}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Rental Policies & Guidelines */}
            <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border" style={{ borderColor: '#E2E8F0' }}>
              <h5 className="fw-bold text-dark font-heading mb-3 d-flex align-items-center gap-2">
                <FileText size={20} className="text-warning" />
                Standard Rental Terms &amp; Conditions
              </h5>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-2.5">
                  <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">Thailand Transport Commercial Permit</strong>
                    <span className="text-muted text-xs">
                      This car operates under a 100% legal {permitLabel} compliant with the Thailand Department of Land Transport (DLT) Commercial Chauffeur Permit.
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-2.5">
                  <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">Kilometre Allowance</strong>
                    <span className="text-muted text-xs">
                      {kmAllowance}. Travel freely from Lamai and Railay in the North down to Phi Phi and Maya Bay in Phuket & Krabi.
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-2.5">
                  <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">Zero Vehicle Deposit Guarantee</strong>
                    <span className="text-muted text-xs">
                      All bookings are 100% deposit-free with zero deductions. Professional driver handles fuel, tolls, and parking maintenance.
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-2.5">
                  <CheckCircle size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">Fuel Policy ({fuelRule})</strong>
                    <span className="text-muted text-xs">
                      The car is handed over with an indicated fuel level. Please return the car with the exact same fuel level. Fuel costs are borne by the renter.
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-2.5">
                  <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">Thailand Traffic &amp; Beach Guidelines</strong>
                    <span className="text-muted text-xs">
                      Driving any vehicle on Thailand beaches is strictly illegal by law and incurs heavy police penalties. Please respect local speed limits (typically 60–70 km/h on highways).
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-2.5">
                  <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark text-xs d-block">24-Hour Rental Day Calculation</strong>
                    <span className="text-muted text-xs">
                      1 rental day equals 24 continuous hours from your scheduled pickup time. Early delivery and airport handover can be easily coordinated.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Booking & Fare Breakdown Sidebar */}
          <div className="col-12 col-lg-4">
            <div className="card border shadow-sm rounded-4 p-4 sticky-top bg-white" style={{ top: '90px', borderColor: '#E2E8F0' }}>
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-warning bg-opacity-15 text-dark fw-bold px-2.5 py-1 text-xxs rounded-pill">
                  ⚡ Best Price Guaranteed
                </span>
                <span className="text-success text-xxs fw-bold">✓ Free Cancellation Available</span>
              </div>

              <div className="text-center py-3.5 mb-3 bg-light rounded-4 border">
                <span className="text-muted text-xxs text-uppercase fw-bold d-block mb-1">Rental Fare</span>
                <div className="d-flex align-items-baseline justify-content-center gap-1.5">
                  <span className="text-decoration-line-through text-muted small">฿{originalPricePerDay.toLocaleString('en-US')}</span>
                  <h2 className="fw-black text-primary mb-0 font-heading" style={{ fontSize: '32px' }}>฿{pricePerDay.toLocaleString('en-US')}</h2>
                  <span className="text-muted text-xs">/ day</span>
                </div>
                <span className="badge bg-success bg-opacity-10 text-success text-xxs mt-1">20% Off Direct Booking Deal</span>
              </div>

              {/* Quick Duration Buttons in Sidebar */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1.5">
                  <span className="text-muted text-xxs text-uppercase fw-bold">Select Days:</span>
                  <span className="text-primary text-xxs fw-bold">{effectiveDays} {effectiveDays === 1 ? 'Day' : 'Days'} Selected</span>
                </div>
                <div className="d-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[1, 2, 3, 4, 5, 7].map((d) => {
                    const isSel = effectiveDays === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        className={`btn btn-sm py-1.5 px-1 fw-bold text-xs rounded-2 transition-all ${
                          isSel ? 'btn-dark text-white shadow-xs' : 'btn-light border text-dark'
                        }`}
                        onClick={() => handleDurationClick(d)}
                      >
                        {d} {d === 1 ? 'Day' : 'Days'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rental Dates Calendar Picker */}
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex align-items-center justify-content-between mb-2 pb-1.5 border-bottom">
                  <span className="text-dark fw-bold text-xs d-flex align-items-center gap-1.5">
                    <Calendar size={14} className="text-primary" /> Rental Calendar
                  </span>
                  <span className="badge bg-primary bg-opacity-10 text-primary text-xxs fw-bold px-2 py-0.5 rounded-pill">
                    {effectiveDays} {effectiveDays === 1 ? 'Day (24h)' : 'Days'}
                  </span>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label text-muted text-xxs fw-bold mb-1 d-block">
                      Pickup Date:
                    </label>
                    <input 
                      type="date" 
                      className="form-control form-control-sm fw-bold border bg-white shadow-xs text-dark" 
                      min={todayStr} 
                      value={currentPickupDate} 
                      onChange={(e) => handlePickupDateChange(e.target.value)} 
                      style={{ fontSize: '0.82rem', borderRadius: '8px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label text-muted text-xxs fw-bold mb-1 d-block">
                      Drop Date:
                    </label>
                    <input 
                      type="date" 
                      className="form-control form-control-sm fw-bold border bg-white shadow-xs text-dark" 
                      min={currentPickupDate}
                      value={currentDropDate} 
                      onChange={(e) => handleDropDateChange(e.target.value)} 
                      style={{ fontSize: '0.82rem', borderRadius: '8px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-1.5 border-top text-xxs">
                  <span className="text-muted">Total Duration:</span>
                  <strong className="text-primary fw-bold">
                    {effectiveDays} {effectiveDays === 1 ? 'Day (24 Hours)' : 'Days'}
                  </strong>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div className="d-flex flex-column gap-2 mb-4 text-xs">
                <div className="d-flex justify-content-between text-muted">
                  <span>Base Fare ({effectiveDays} {effectiveDays === 1 ? 'Day' : 'Days'} × ฿{pricePerDay.toLocaleString('en-US')})</span>
                  <span className="fw-semibold text-dark">฿{rawRentalTotal.toLocaleString('en-US')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="d-flex justify-content-between text-success fw-bold">
                    <span>Multi-Day Discount ({effectiveDays >= 7 ? '10%' : '5%'} Off)</span>
                    <span>-฿{discountAmount.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between text-muted">
                  <span>Taxes &amp; GST (18%)</span>
                  <span className="fw-semibold text-dark">฿{gstAmount.toLocaleString('en-US')}</span>
                </div>
                <div className="d-flex justify-content-between text-muted">
                  <span>Kilometre Allowance</span>
                  <span className="text-success fw-semibold">{kmAllowance}</span>
                </div>
                <div className="d-flex justify-content-between text-muted">
                  <span>Air Conditioning</span>
                  <span className="text-success fw-semibold">{hasAc ? 'Included (Chilled AC)' : 'Non-AC'}</span>
                </div>
                <div className="d-flex justify-content-between text-muted">
                  <span>Doorstep Airport / Hotel Delivery</span>
                  <span className="text-success fw-semibold">FREE</span>
                </div>
                
                <hr className="my-1 border-secondary border-opacity-25" />
                
                <div className="d-flex justify-content-between align-items-baseline">
                  <div>
                    <span className="fw-bold text-dark fs-6 d-block">Booking Total</span>
                    <span className="text-muted text-xxs">All taxes &amp; fees included</span>
                  </div>
                  <span className="fw-black text-primary fs-4">฿{estimatedTotal.toLocaleString('en-US')}</span>
                </div>

                {/* Refundable Security Deposit Notice */}
                <div className="p-2.5 rounded-3 bg-light border mt-1">
                  <div className="d-flex justify-content-between align-items-center mb-0.5">
                    <span className="fw-bold text-dark text-xxs">Security Deposit:</span>
                      <span className="badge bg-success bg-opacity-10 text-success fw-bold text-xxs">฿0 (Zero Deposit)</span>
                  </div>
                  <span className="text-muted text-xxs d-block" style={{ fontSize: '10px' }}>
                    Collected at vehicle key handover &amp; 100% refunded immediately upon vehicle return.
                  </span>
                </div>
              </div>

              {/* Capacity Validation Notice */}
              {isCraftMyTrip && (memberCount > seatingCapacity || capacityError) && (
                <div className="alert alert-warning border border-warning rounded-3 p-3 mb-3 text-xs" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                  <div className="d-flex align-items-start gap-2">
                    <AlertCircle size={17} className="text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="fw-bold text-dark mb-1">Capacity Notice</div>
                      <div className="text-secondary mb-2">
                        {capacityError || `This vehicle accommodates up to ${seatingCapacity} passengers. Please choose another vehicle or reduce the number of members.`}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        {onMemberCountChange && (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning text-dark fw-bold rounded-pill px-2.5 py-1 text-xxs"
                            onClick={() => {
                              onMemberCountChange(seatingCapacity);
                              setCapacityError(null);
                            }}
                          >
                            Update to {seatingCapacity} members
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 text-xxs"
                          onClick={() => {
                            if (document.activeElement?.blur) document.activeElement.blur();
                            onBack();
                          }}
                        >
                          Choose Another Vehicle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary CTA: Book Now / Select & Continue */}
              <button
                type="button"
                onClick={handleBookNowClick}
                className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 hover-scale font-heading"
                style={{ background: '#FF6333', borderColor: '#FF6333', padding: '12px 20px', fontSize: '15px' }}
              >
                <span>{actionLabel || 'Continue to Booking'}</span>
                <ChevronRight size={18} />
              </button>

              <div className="text-center mt-3 text-muted text-xxs">
                🔒 Safe &amp; Secure Booking • Fast Confirmation via WhatsApp/SMS
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ─── 5. MOBILE STICKY BOTTOM BAR ─── */}
      <div 
        className="d-lg-none fixed-bottom bg-white border-top px-4 py-3 shadow-lg d-flex justify-content-between align-items-center"
        style={{ zIndex: 1010 }}
      >
        <div>
          <span className="text-muted text-xxs d-block">Total ({effectiveDays} {effectiveDays === 1 ? 'day' : 'days'})</span>
          <div className="fw-black text-primary font-heading fs-5 mb-0">
            ฿{estimatedTotal.toLocaleString('en-US')}
          </div>
        </div>
        <button
          type="button"
          onClick={handleBookNowClick}
          className="btn btn-primary rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-1.5 shadow-sm font-heading hover-scale"
          style={{ background: '#FF6333', borderColor: '#FF6333', color: '#FFFFFF' }}
        >
          <span>{actionLabel || 'Continue to Booking'}</span>
          <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
}
