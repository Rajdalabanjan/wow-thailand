import React, { useRef, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bike, Car, Crown, Sparkles, Star, Camera } from 'lucide-react';
import { getMarkupPrice } from '../../utils/pricingHelper';

// ─── CURATED VEHICLE FLEET DATA (Matching Reference Layout & Fallbacks) ────────
const DEFAULT_TWO_WHEELERS = [
  {
    id: 'bike-th-1',
    name: 'Honda PCX 160 eSP+',
    category: 'Scooter',
    price: 450,
    rating: 4.85,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '160cc',
    type: 'bike'
  },
  {
    id: 'bike-th-2',
    name: 'Yamaha NMAX 155 ABS',
    category: 'Scooter',
    price: 500,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '155cc',
    type: 'bike'
  },
  {
    id: 'bike-th-3',
    name: 'Vespa Sprint 150 i-Get',
    category: 'Classic',
    price: 800,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '150cc',
    type: 'bike'
  },
  {
    id: 'bike-th-4',
    name: 'Honda Click 125i',
    category: 'City Scooter',
    price: 350,
    rating: 4.70,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '125cc',
    type: 'bike'
  },
  {
    id: 'bike-th-5',
    name: 'Honda Forza 350 Touring',
    category: 'Maxi Scooter',
    price: 1200,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '350cc',
    type: 'bike'
  },
  {
    id: 'bike-th-6',
    name: 'Yamaha XMAX 300 Tech MAX',
    category: 'Maxi Scooter',
    price: 1100,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '300cc',
    type: 'bike'
  }
];

const DEFAULT_FOUR_WHEELERS = [
  {
    id: 'car-th-1',
    name: 'Toyota Altis Sedan',
    category: 'Sedan',
    price: 800,
    rating: 4.85,
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol / Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'car-th-2',
    name: 'Toyota Camry Executive',
    category: 'Premium Sedan',
    price: 1200,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'car-th-3',
    name: 'Toyota Fortuner VIP 4x4',
    category: 'SUV',
    price: 1500,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'car-th-4',
    name: 'Toyota Commuter VIP 9-Seater Van',
    category: 'VIP Van',
    price: 1800,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '9 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'car-th-5',
    name: 'Honda CR-V e:HEV RS',
    category: 'Luxury SUV',
    price: 1600,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '5 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'car-th-6',
    name: 'Toyota Majesty Ultra-VIP Van',
    category: 'Executive Van',
    price: 2800,
    rating: 4.98,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 VIP Captain Seats',
    transmission: 'Automatic',
    type: 'car'
  }
];

const DEFAULT_LUXURY_CARS = [
  {
    id: 'lux-th-1',
    name: 'Toyota Alphard Executive Lounge',
    category: 'Ultra VIP Van',
    price: 4500,
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '4 VIP First-Class Ottoman Seats',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'lux-th-2',
    name: 'Mercedes-Benz E-Class VIP Chauffeur',
    category: 'Executive Sedan',
    price: 3500,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol / Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car'
  },
  {
    id: 'lux-th-3',
    name: 'BMW 7 Series VIP First Class',
    category: 'Presidential Sedan',
    price: 5500,
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car'
  }
];

function isBike(item) {
  if (!item) return false;
  if (item._type === 'bike' || item.type === 'bike') return true;
  const cat = (item.category || '').toLowerCase();
  if (cat.includes('bike') || cat.includes('scooter') || cat.includes('moped') || cat.includes('cruiser') || cat.includes('superbike')) return true;
  const name = (item.name || '').toLowerCase();
  if (name.includes('ninja') || name.includes('activa') || name.includes('jupiter') || name.includes('bullet') || name.includes('ktm') || name.includes('duke') || name.includes('r15') || name.includes('pulsar') || name.includes('access') || name.includes('himalayan') || name.includes('gt')) return true;
  return false;
}

function isLuxuryCar(item) {
  if (!item || isBike(item)) return false;
  const price = parseFloat(item.price) || 0;
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (cat.includes('luxury') || cat.includes('vip') || cat.includes('premium') || cat.includes('supercar')) return true;
  if (name.includes('bmw') || name.includes('mercedes') || name.includes('audi') || name.includes('defender') || name.includes('fortuner') || name.includes('jaguar') || name.includes('range rover')) return true;
  if (price >= 4000) return true;
  return false;
}

// ─── INDIVIDUAL CATEGORY ROW ──────────────────────────────────────────────────
function CategoryRow({
  badgeGradient,
  badgeIcon: BadgeIcon,
  badgeTitle,
  badgeSubtitle,
  vehicles = [],
  onViewAll,
  onBookVehicle,
  onViewVehicle
}) {
  const scrollContainerRef = useRef(null);
  const isInteractingRef = useRef(false);
  const pauseTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Triple the list to create a seamless, continuous 2-way infinite slide
  const loopVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    return [...vehicles, ...vehicles, ...vehicles];
  }, [vehicles]);

  const pauseAutoScroll = (duration = 3500) => {
    isInteractingRef.current = true;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, duration);
  };

  // Continuous auto-slide forward with seamless looping
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || loopVehicles.length === 0) return;

    // Set initial scroll position to middle set for smooth 2-way navigation
    const initTimer = setTimeout(() => {
      if (el && el.scrollWidth > el.clientWidth && el.scrollLeft < 10) {
        const singleSet = el.scrollWidth / 3;
        el.scrollLeft = singleSet;
      }
    }, 150);

    let animId;
    let lastTime = performance.now();
    const speed = 0.55; // buttery smooth steady glide

    const step = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      if (!isInteractingRef.current && !isDraggingRef.current && el && el.scrollWidth > el.clientWidth) {
        const factor = Math.min(delta / 16.67, 2.0);
        el.scrollLeft += speed * factor;

        const singleSet = el.scrollWidth / 3;
        if (singleSet > 50) {
          if (el.scrollLeft >= singleSet * 2) {
            el.scrollLeft -= singleSet;
          } else if (el.scrollLeft <= 5) {
            el.scrollLeft += singleSet;
          }
        }
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      clearTimeout(initTimer);
      if (animId) cancelAnimationFrame(animId);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [loopVehicles]);

  const handleScrollLeft = () => {
    pauseAutoScroll(4000);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    pauseAutoScroll(4000);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftStartRef.current = scrollContainerRef.current.scrollLeft;
    pauseAutoScroll(5000);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      pauseAutoScroll(3000);
    }
  };

  return (
    <div 
      className="sd-category-row-card shadow-sm mb-4"
      onMouseEnter={() => { isInteractingRef.current = true; }}
      onMouseLeave={() => { 
        handleMouseUpOrLeave();
        pauseAutoScroll(1500); 
      }}
    >
      {/* ─── Left Brand / Category Banner ─── */}
      <div 
        className="sd-category-banner"
        style={{ background: badgeGradient, cursor: 'pointer' }}
        onClick={onViewAll}
        title={`Click to view all ${badgeTitle}`}
      >
        <div className="sd-category-icon-wrap">
          <BadgeIcon size={36} strokeWidth={2.4} className="text-white" />
        </div>
        <div className="sd-category-info">
          <h3 className="sd-category-title">{badgeTitle}</h3>
          <p className="sd-category-subtitle mb-0">{badgeSubtitle}</p>
        </div>
      </div>

      {/* ─── Slider & Vehicle Cards Section ─── */}
      <div className="sd-slider-wrapper">
        {/* Left Arrow Button */}
        <button 
          type="button" 
          className="sd-nav-btn sd-nav-btn-left" 
          onClick={handleScrollLeft}
          aria-label={`Scroll ${badgeTitle} left`}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Top-Right "View All >" Link */}
        <div className="sd-view-all-container">
          <button 
            type="button" 
            className="sd-view-all-link"
            onClick={onViewAll}
          >
            View All &gt;
          </button>
        </div>

        {/* Horizontal Vehicle Cards Track */}
        <div 
          className="sd-cards-scroll-track" 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onTouchStart={() => pauseAutoScroll(5000)}
          onTouchEnd={() => pauseAutoScroll(2500)}
          style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        >
          {loopVehicles.map((v, idx) => (
            <div 
              key={`${v.id || 'v'}-${idx}`} 
              className="sd-vehicle-card"
              onClick={(e) => {
                if (hasDraggedRef.current) {
                  e.preventDefault();
                  return;
                }
                // CATEGORY-FIRST BROWSING:
                // Clicking any vehicle card in this category carousel opens the complete category listing!
                // It does NOT automatically select or book the individual vehicle.
                if (onViewAll) onViewAll();
                else if (onViewVehicle) onViewVehicle(v);
              }}
              title={`Click to view all ${badgeTitle}`}
              style={{ cursor: 'pointer' }}
            >
              {/* Vehicle Image */}
              <div className="sd-card-img-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
                {v.image ? (
                  <img 
                    src={v.image} 
                    alt={v.name}
                    className="sd-card-img"
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallbackEl = e.target.parentElement.querySelector('.no-photo-wrap');
                      if (fallbackEl) fallbackEl.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="no-photo-wrap flex-column align-items-center justify-content-center w-100 h-100 text-muted p-2" 
                  style={{ display: v.image ? 'none' : 'flex', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '120px' }}
                >
                  <Camera size={22} className="text-secondary opacity-50 mb-1" />
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>No photo uploaded</span>
                </div>
              </div>

              {/* Vehicle Name */}
              <div className="sd-card-title" title={v.name}>
                {v.name}
              </div>

              {/* Price and Rating Row */}
              <div className="sd-card-meta">
                <span className="sd-card-price">
                  ฿{Number(v.price || 0).toLocaleString('en-US')} <span className="sd-card-per">/ day</span>
                </span>
                <span className="sd-card-rating">
                  <Star size={12} className="sd-star-icon" fill="#10B981" color="#10B981" />
                  <span className="sd-rating-num">{v.rating || 4.8}</span>
                </span>
              </div>

              {/* Little dash indicator & Explore Category Link */}
              <div className="sd-dash-indicator-wrap">
                <span className={`sd-dash ${idx % 3 === 0 ? 'active' : ''}`} />
                <span className={`sd-dash ${idx % 3 === 1 ? 'active' : ''}`} />
                <span className={`sd-dash ${idx % 3 === 2 ? 'active' : ''}`} />
              </div>
              <div className="sd-explore-hint mt-1 text-center">
                <span className="text-xxs fw-bold d-inline-flex align-items-center gap-1" style={{ fontSize: '10.5px', color: '#FF6333' }}>
                  Explore All {badgeTitle} →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button 
          type="button" 
          className="sd-nav-btn sd-nav-btn-right" 
          onClick={handleScrollRight}
          aria-label={`Scroll ${badgeTitle} right`}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

function matchesVehicleFilters(vehicle, appliedFilters, vehicleCategoryType) {
  if (!appliedFilters) return true;

  // 1. Vehicle Type
  const vTypes = appliedFilters.vehicleTypes || [];
  if (vTypes.length > 0 && vehicleCategoryType) {
    if (!vTypes.includes(vehicleCategoryType)) return false;
  }

  // 2. Car Sub-Filters
  const carSubs = appliedFilters.carSubFilters || [];
  if (carSubs.length > 0 && vehicle.type === 'car') {
    const name = (vehicle.name || '').toLowerCase();
    const cat = (vehicle.category || '').toLowerCase();
    const matchesCarSub = carSubs.some(sub => {
      const s = sub.toLowerCase();
      if (s.includes('hatchback')) return cat.includes('hatchback') || name.includes('swift') || name.includes('i10') || name.includes('i20') || name.includes('tiago') || name.includes('wagon');
      if (s.includes('sedan')) return cat.includes('sedan') || name.includes('dzire') || name.includes('city') || name.includes('verna') || name.includes('ciaz') || name.includes('aura') || name.includes('c-class') || name.includes('a4');
      if (s.includes('suv')) return cat.includes('suv') || name.includes('creta') || name.includes('brezza') || name.includes('seltos') || name.includes('nexon') || name.includes('thar') || name.includes('fortuner') || name.includes('x1') || name.includes('q3');
      if (s.includes('7-seater') || s.includes('muv')) return cat.includes('7') || cat.includes('muv') || name.includes('ertiga') || name.includes('innova') || name.includes('carens') || name.includes('scorpio') || name.includes('fortuner');
      if (s.includes('open top') || s.includes('thar')) return cat.includes('open') || cat.includes('thar') || name.includes('thar') || name.includes('jimny') || name.includes('gypsy');
      if (s.includes('convertible')) return cat.includes('convertible') || cat.includes('cabriolet') || cat.includes('coupe') || name.includes('convertible') || name.includes('cla') || name.includes('z4') || name.includes('cabriolet');
      return cat.includes(s) || name.includes(s);
    });
    if (!matchesCarSub) return false;
  }

  // 3. Bike Sub-Filters
  const bikeSubs = appliedFilters.bikeSubFilters || [];
  if (bikeSubs.length > 0 && vehicle.type === 'bike') {
    const name = (vehicle.name || '').toLowerCase();
    const cat = (vehicle.category || '').toLowerCase();
    const matchesBikeSub = bikeSubs.some(sub => {
      const s = sub.toLowerCase();
      if (s.includes('scooter')) return cat.includes('scooter') || name.includes('activa') || name.includes('jupiter') || name.includes('access') || name.includes('dio') || name.includes('ntorq') || name.includes('fascino');
      if (s.includes('cruiser') || s.includes('enfield')) return cat.includes('cruiser') || name.includes('classic') || name.includes('bullet') || name.includes('hunter') || name.includes('meteor') || name.includes('himalayan') || name.includes('thunderbird') || name.includes('interceptor') || name.includes('continental');
      if (s.includes('sports')) return cat.includes('sports') || cat.includes('superbike') || name.includes('r15') || name.includes('ktm') || name.includes('duke') || name.includes('pulsar') || name.includes('ninja') || name.includes('rc') || name.includes('apache');
      if (s.includes('electric') || s.includes('ev')) return (vehicle.fuel || '').toLowerCase().includes('electric') || name.includes('ev') || name.includes('ather') || name.includes('ola') || name.includes('chetak') || cat.includes('ev') || cat.includes('electric');
      return cat.includes(s) || name.includes(s);
    });
    if (!matchesBikeSub) return false;
  }

  // 4. Transmission
  const trans = appliedFilters.vehicleTransmission || [];
  if (trans.length > 0 && vehicle.transmission) {
    const vTrans = (vehicle.transmission || '').toLowerCase();
    const matchesTrans = trans.some(t => {
      if (t.toLowerCase() === 'manual') return vTrans.includes('manual');
      if (t.toLowerCase() === 'automatic') return vTrans.includes('auto') || vTrans.includes('amt') || vTrans.includes('at') || vTrans.includes('cvt') || vTrans.includes('dct');
      return true;
    });
    if (!matchesTrans) return false;
  }

  // 5. Fuel Type
  const fuels = appliedFilters.vehicleFuel || [];
  if (fuels.length > 0 && vehicle.fuel) {
    const vFuel = (vehicle.fuel || '').toLowerCase();
    const matchesFuel = fuels.some(f => {
      if (f.toLowerCase().includes('petrol')) return vFuel.includes('petrol');
      if (f.toLowerCase().includes('diesel')) return vFuel.includes('diesel');
      if (f.toLowerCase().includes('electric') || f.toLowerCase().includes('ev')) return vFuel.includes('electric') || vFuel.includes('ev');
      return true;
    });
    if (!matchesFuel) return false;
  }

  // 6. Seating
  const seatings = appliedFilters.vehicleSeating || [];
  if (seatings.length > 0 && vehicle.type === 'car') {
    const vSeat = String(vehicle.seating || '5');
    const matchesSeat = seatings.some(st => {
      if (st.includes('2')) return vSeat.includes('2');
      if (st.includes('4') || st.includes('5')) return vSeat.includes('4') || vSeat.includes('5');
      if (st.includes('7')) return vSeat.includes('7') || vSeat.includes('8');
      return true;
    });
    if (!matchesSeat) return false;
  }

  // 7. Budget Per Day
  const budgets = appliedFilters.vehicleBudget || [];
  if (budgets.length > 0) {
    const price = parseFloat(vehicle.price) || 0;
    const matchesBudget = budgets.some(b => {
      if (b === '< 1500') return price < 1500;
      if (b === '1500-3000') return price >= 1500 && price <= 3000;
      if (b === '3000-6000') return price >= 3000 && price <= 6000;
      if (b === '> 6000') return price > 6000;
      return true;
    });
    if (!matchesBudget) return false;
  }

  return true;
}

// ─── MAIN SELF DRIVE CATEGORY SHOWCASE COMPONENT ─────────────────────────────
export default function SelfDriveCategoryShowcase({
  cars = [],
  bikes = [],
  markups = [],
  onBookVehicle,
  onViewVehicle,
  onSelectCategory,
  setActiveTab,
  searchQuery = '',
  appliedFilters = {},
  setAppliedFilters
}) {
  const isAvailableItem = (item) => item.is_available === 1 || item.is_available === '1' || item.is_available === true || item.is_available === undefined;

  // 1. Process Two Wheelers (database bikes prioritized)
  const twoWheelers = useMemo(() => {
    const liveBikes = (bikes || []).filter(isAvailableItem).map(b => ({ 
      ...b, 
      type: 'bike',
      price: getMarkupPrice(b.price, b.vendor_id || 'global', 'bikes', b.id, markups, 'b2c')
    }));
    const extraBikesFromCars = (cars || []).filter(c => isBike(c) && isAvailableItem(c)).map(c => ({ 
      ...c, 
      type: 'bike',
      price: getMarkupPrice(c.price, c.vendor_id || 'global', 'bikes', c.id, markups, 'b2c')
    }));
    const combinedLive = [...liveBikes, ...extraBikesFromCars];
    
    // Deduplicate by name
    const namesSeen = new Set();
    const result = [];
    
    combinedLive.forEach(b => {
      if (b.name && !namesSeen.has(b.name.toLowerCase().trim())) {
        namesSeen.add(b.name.toLowerCase().trim());
        result.push(b);
      }
    });

    // Fall back to defaults only if no database items exist
    if (result.length === 0) {
      DEFAULT_TWO_WHEELERS.forEach(b => {
        if (!namesSeen.has(b.name.toLowerCase().trim())) {
          namesSeen.add(b.name.toLowerCase().trim());
          result.push(b);
        }
      });
    }

    let filtered = result;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v => v.name.toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q));
    }
    return filtered.filter(v => matchesVehicleFilters(v, appliedFilters, 'Two Wheelers'));
  }, [bikes, cars, markups, searchQuery, appliedFilters]);

  // 2. Process Four Wheelers (Standard non-luxury database cars prioritized)
  const fourWheelers = useMemo(() => {
    const liveStandardCars = (cars || []).filter(c => !isBike(c) && !isLuxuryCar(c) && isAvailableItem(c)).map(c => ({ 
      ...c, 
      type: 'car',
      price: getMarkupPrice(c.price, c.vendor_id || 'global', 'cars', c.id, markups, 'b2c')
    }));
    
    const namesSeen = new Set();
    const result = [];

    liveStandardCars.forEach(c => {
      if (c.name && !namesSeen.has(c.name.toLowerCase().trim())) {
        namesSeen.add(c.name.toLowerCase().trim());
        result.push(c);
      }
    });

    // Fall back to defaults only if no database items exist
    if (result.length === 0) {
      DEFAULT_FOUR_WHEELERS.forEach(c => {
        if (!namesSeen.has(c.name.toLowerCase().trim())) {
          namesSeen.add(c.name.toLowerCase().trim());
          result.push(c);
        }
      });
    }

    let filtered = result;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v => v.name.toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q));
    }
    return filtered.filter(v => matchesVehicleFilters(v, appliedFilters, 'Four Wheelers'));
  }, [cars, markups, searchQuery, appliedFilters]);

  // 3. Process Luxury Cars (Database luxury vehicles prioritized)
  const luxuryCars = useMemo(() => {
    const liveLuxuryCars = (cars || []).filter(c => isLuxuryCar(c) && isAvailableItem(c)).map(c => ({ 
      ...c, 
      type: 'car',
      price: getMarkupPrice(c.price, c.vendor_id || 'global', 'cars', c.id, markups, 'b2c')
    }));
    
    const namesSeen = new Set();
    const result = [];

    liveLuxuryCars.forEach(c => {
      if (c.name && !namesSeen.has(c.name.toLowerCase().trim())) {
        namesSeen.add(c.name.toLowerCase().trim());
        result.push(c);
      }
    });

    // Fall back to defaults only if no database items exist
    if (result.length === 0) {
      DEFAULT_LUXURY_CARS.forEach(c => {
        if (!namesSeen.has(c.name.toLowerCase().trim())) {
          namesSeen.add(c.name.toLowerCase().trim());
          result.push(c);
        }
      });
    }

    let filtered = result;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v => v.name.toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q));
    }
    return filtered.filter(v => matchesVehicleFilters(v, appliedFilters, 'Luxury Cars'));
  }, [cars, markups, searchQuery, appliedFilters]);

  const scrollToResultsSection = () => {
    setTimeout(() => {
      const el = document.getElementById('vehicles-fleet-view') || document.getElementById('results-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleViewAllBikes = () => {
    try { sessionStorage.setItem('tg_activeTab', 'bikes'); } catch (e) {}
    if (onSelectCategory) onSelectCategory('bikes');
    else if (setActiveTab) setActiveTab('bikes');
    scrollToResultsSection();
  };

  const handleViewAllCars = () => {
    try {
      sessionStorage.setItem('tg_carCategoryFilter', 'Four Wheelers');
      sessionStorage.setItem('tg_activeTab', 'cars');
    } catch (e) {}
    if (onSelectCategory) onSelectCategory('Four Wheelers');
    else if (setActiveTab) setActiveTab('cars');
    scrollToResultsSection();
  };

  const handleViewAllLuxury = () => {
    try {
      sessionStorage.setItem('tg_carCategoryFilter', 'Luxury Cars');
      sessionStorage.setItem('tg_activeTab', 'cars');
    } catch (e) {}
    if (onSelectCategory) onSelectCategory('Luxury Cars');
    else if (setActiveTab) setActiveTab('cars');
    scrollToResultsSection();
  };

  const hasAnyMatches = twoWheelers.length > 0 || fourWheelers.length > 0 || luxuryCars.length > 0;

  return (
    <section className="sd-category-showcase-section" id="self-drive-categories">
      <div className="container px-md-3">
        {!hasAnyMatches ? (
          <div className="text-center py-5 bg-white rounded-4 shadow-sm border p-4 my-4">
            <h5 className="fw-bold text-dark mb-2">No Vehicles Match Your Selected Filters</h5>
            <p className="text-muted small mb-3">Try adjusting your filters, budget, or transmission options to see more vehicles.</p>
            {setAppliedFilters && (
              <button
                type="button"
                className="btn btn-warning btn-sm fw-bold px-3 py-1.5"
                onClick={() => setAppliedFilters({})}
              >
                Clear All Vehicle Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Row 1: Two Wheelers (Orange gradient) */}
            {twoWheelers.length > 0 && (
              <CategoryRow
                badgeGradient="linear-gradient(135deg, #FF6026 0%, #FF833E 100%)"
                badgeIcon={Bike}
                badgeTitle="Two Wheelers"
                badgeSubtitle="Ride in style"
                vehicles={twoWheelers}
                onViewAll={handleViewAllBikes}
                onBookVehicle={onBookVehicle}
                onViewVehicle={onViewVehicle}
              />
            )}

            {/* Row 2: Four Wheelers (Blue gradient) */}
            {fourWheelers.length > 0 && (
              <CategoryRow
                badgeGradient="linear-gradient(135deg, #0284C7 0%, #2563EB 100%)"
                badgeIcon={Car}
                badgeTitle="Four Wheelers"
                badgeSubtitle="Comfort for every trip"
                vehicles={fourWheelers}
                onViewAll={handleViewAllCars}
                onBookVehicle={onBookVehicle}
                onViewVehicle={onViewVehicle}
              />
            )}

            {/* Row 3: Luxury Cars (Purple / Violet gradient) */}
            {luxuryCars.length > 0 && (
              <CategoryRow
                badgeGradient="linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)"
                badgeIcon={Crown}
                badgeTitle="Luxury Cars"
                badgeSubtitle="Live the experience"
                vehicles={luxuryCars}
                onViewAll={handleViewAllLuxury}
                onBookVehicle={onBookVehicle}
                onViewVehicle={onViewVehicle}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
