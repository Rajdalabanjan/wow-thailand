import React, { useState, useMemo, useEffect } from 'react';
import { Star, Users, TrendingUp, ShieldCheck, Award, Filter, AlertCircle, RotateCcw, ChevronLeft, ChevronRight, Camera, Sparkles, RotateCw, Car, Crown, Plane } from 'lucide-react';
import { getMarkupPrice } from '../../utils/pricingHelper';

function isLuxuryCar(item) {
  if (!item) return false;
  const price = parseFloat(item.price) || 0;
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (cat.includes('luxury') || cat.includes('vip') || cat.includes('premium')) return true;
  if (name.includes('alphard') || name.includes('majesty') || name.includes('mercedes') || name.includes('bmw')) return true;
  if (price >= 3500) return true;
  return false;
}

const DEFAULT_THAILAND_FLEET = [
  {
    id: 'th-fleet-1',
    name: 'Toyota Commuter VIP 10-12 Seater',
    category: 'VIP Minivan',
    price: 1800,
    rating: 4.95,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '10-12 Seater',
    transmission: 'Automatic',
    type: 'van',
    has_ac: 1,
    location: 'Bangkok (BKK / DMK), Phuket (HKT), Pattaya, Chiang Mai'
  },
  {
    id: 'th-fleet-2',
    name: 'Toyota Alphard Executive Lounge VIP',
    category: 'VIP Luxury',
    price: 4500,
    rating: 4.99,
    image: 'https://images.unsplash.com/photo-1567818735868-e71b99932e29?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '5-6 Seater',
    transmission: 'Automatic',
    type: 'van',
    has_ac: 1,
    location: 'Bangkok (BKK / DMK), Phuket (HKT)'
  },
  {
    id: 'th-fleet-3',
    name: 'Hyundai Staria VIP Luxury Van',
    category: 'VIP Minivan',
    price: 2200,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '9-11 Seater',
    transmission: 'Automatic',
    type: 'van',
    has_ac: 1,
    location: 'Suvarnabhumi Airport (BKK), Don Mueang (DMK), Pattaya'
  },
  {
    id: 'th-fleet-4',
    name: 'Toyota Camry Executive Sedan',
    category: 'Executive Sedan',
    price: 1200,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Bangkok City & Suvarnabhumi Airport'
  },
  {
    id: 'th-fleet-5',
    name: 'Toyota Corolla Altis Chauffeur',
    category: 'Sedan Cab',
    price: 950,
    rating: 4.82,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'All Thailand Airports & Cities'
  },
  {
    id: 'th-fleet-6',
    name: 'Honda Accord Tech Luxury Sedan',
    category: 'Executive Sedan',
    price: 1400,
    rating: 4.87,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    fuel: 'Hybrid',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Bangkok & Pattaya Direct Transfer'
  },
  {
    id: 'th-fleet-7',
    name: 'Toyota Fortuner 4x4 Luxury SUV',
    category: 'Luxury SUV',
    price: 2200,
    rating: 4.92,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Phuket International Airport (HKT) & Krabi'
  },
  {
    id: 'th-fleet-8',
    name: 'Toyota Innova Crysta MPV',
    category: 'Family MPV',
    price: 1600,
    rating: 4.88,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'All Thailand Airport & Hotel Pick & Drop'
  },
  {
    id: 'th-fleet-9',
    name: 'Mercedes-Benz E-Class VIP Chauffeur',
    category: 'VIP Luxury',
    price: 5000,
    rating: 4.98,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Bangkok VIP Chauffeur Service'
  },
  {
    id: 'th-fleet-10',
    name: 'Ford Everest Titanium 4WD',
    category: 'Luxury SUV',
    price: 2500,
    rating: 4.90,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Chiang Mai, Phuket & Krabi'
  },
  {
    id: 'th-fleet-11',
    name: 'Isuzu MU-X Premium 7-Seater',
    category: 'Family SUV',
    price: 1900,
    rating: 4.85,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80',
    fuel: 'Diesel',
    seating: '7 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Phuket, Krabi & Samui'
  },
  {
    id: 'th-fleet-12',
    name: 'BMW 5 Series VIP Chauffeur',
    category: 'VIP Luxury',
    price: 5500,
    rating: 4.96,
    image: 'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    seating: '4 Seater',
    transmission: 'Automatic',
    type: 'car',
    has_ac: 1,
    location: 'Suvarnabhumi Airport (BKK) VIP Fast-Track'
  }
];

export default function CarsPage({
  carCategoryFilter: propCarCategoryFilter,
  setCarCategoryFilter: propSetCarCategoryFilter,
  onBack,
  carFilterFuel = 'All',
  setCarFilterFuel,
  carFilterTrans = 'All',
  setCarFilterTrans,
  handleOpenBooking,
  onViewDetails,
  cars = [],
  searchQuery,
  markups = [],
  appliedFilters = {},
  setAppliedFilters
}) {
  const [localCategoryFilter, setLocalCategoryFilter] = useState(() => {
    try {
      return sessionStorage.getItem('tg_carCategoryFilter') || 'All';
    } catch (e) {
      return 'All';
    }
  });

  const carCategoryFilter = propCarCategoryFilter !== undefined ? propCarCategoryFilter : localCategoryFilter;
  const setCarCategoryFilter = (cat) => {
    try { sessionStorage.setItem('tg_carCategoryFilter', cat); } catch (e) {}
    if (propSetCarCategoryFilter) propSetCarCategoryFilter(cat);
    setLocalCategoryFilter(cat);
  };

  // Smoothly glide down to the vehicle fleet header
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById('vehicles-fleet-view') || document.getElementById('results-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [carCategoryFilter]);

  const displayCars = useMemo(() => {
    const isAvailableItem = (c) => c && c.is_available !== 0 && c.is_available !== '0' && c.is_available !== false;
    const rawCars = (cars || []).filter(c => isAvailableItem(c)).map(car => ({
      ...car,
      type: car.type || 'car',
      price: getMarkupPrice(parseFloat(car.price || 0), car.vendor_id || 'global', 'cars', car.id, markups, 'b2c')
    }));

    const namesSeen = new Set();
    const result = [];

    rawCars.forEach(c => {
      if (c.name && !namesSeen.has(c.name.toLowerCase().trim())) {
        namesSeen.add(c.name.toLowerCase().trim());
        result.push(c);
      }
    });

    // Merge default Thailand vehicles if not already present
    DEFAULT_THAILAND_FLEET.forEach(c => {
      if (!namesSeen.has(c.name.toLowerCase().trim())) {
        namesSeen.add(c.name.toLowerCase().trim());
        result.push(c);
      }
    });

    return result;
  }, [cars, markups]);

  const filteredCars = useMemo(() => {
    const appTrans = appliedFilters?.vehicleTransmission || [];
    const appFuel = appliedFilters?.vehicleFuel || [];
    const appSeats = appliedFilters?.vehicleSeating || [];
    const appBudget = appliedFilters?.vehicleBudget || [];

    const results = displayCars.filter(car => {
      const name = (car.name || '').toLowerCase();
      const cat = (car.category || '').toLowerCase();
      const vFuel = (car.fuel || '').toLowerCase();
      const vTrans = (car.transmission || '').toLowerCase();
      const vSeat = String(car.seating || '4');
      const price = parseFloat(car.price || 0);

      // Category filter (All | VIP Vans | Sedans | SUVs)
      let categoryMatch = true;
      if (carCategoryFilter === 'VIP Vans' || carCategoryFilter === 'VIP Minivans') {
        categoryMatch = cat.includes('van') || name.includes('commuter') || name.includes('alphard') || name.includes('staria') || name.includes('majesty');
      } else if (carCategoryFilter === 'Sedans') {
        categoryMatch = cat.includes('sedan') || name.includes('camry') || name.includes('altis') || name.includes('accord') || name.includes('mercedes') || name.includes('bmw');
      } else if (carCategoryFilter === 'SUVs' || carCategoryFilter === 'Family SUVs & MPVs') {
        categoryMatch = cat.includes('suv') || cat.includes('mpv') || name.includes('fortuner') || name.includes('innova') || name.includes('everest') || name.includes('mu-x');
      } else if (carCategoryFilter === 'Luxury Cars') {
        categoryMatch = isLuxuryCar(car);
      }

      if (!categoryMatch) return false;

      const fuelMatch = (!carFilterFuel || carFilterFuel === 'All' || car.fuel === carFilterFuel) &&
        (appFuel.length === 0 || appFuel.some(f => {
          if (f.toLowerCase().includes('petrol')) return vFuel.includes('petrol');
          if (f.toLowerCase().includes('diesel')) return vFuel.includes('diesel');
          if (f.toLowerCase().includes('electric') || f.toLowerCase().includes('hybrid')) return vFuel.includes('electric') || vFuel.includes('hybrid');
          return true;
        }));

      const transMatch = (!carFilterTrans || carFilterTrans === 'All' || car.transmission === carFilterTrans) &&
        (appTrans.length === 0 || appTrans.some(t => {
          if (t.toLowerCase() === 'manual') return vTrans.includes('manual');
          if (t.toLowerCase() === 'automatic') return vTrans.includes('auto');
          return true;
        }));

      const seatMatch = appSeats.length === 0 || appSeats.some(st => {
        if (st.includes('4') || st.includes('5')) return vSeat.includes('4') || vSeat.includes('5');
        if (st.includes('7')) return vSeat.includes('7');
        if (st.includes('9') || st.includes('10') || st.includes('12')) return vSeat.includes('9') || vSeat.includes('10') || vSeat.includes('11') || vSeat.includes('12');
        return true;
      });

      const budgetMatch = appBudget.length === 0 || appBudget.some(b => {
        if (b === '< 1500') return price < 1500;
        if (b === '1500-3000') return price >= 1500 && price <= 3000;
        if (b === '3000-6000') return price >= 3000 && price <= 6000;
        if (b === '> 6000') return price > 6000;
        return true;
      });

      const q = (searchQuery || '').toLowerCase().trim();
      const searchMatch = !q || 
                          q === 'thailand' || 
                          q === 'all thailand' || 
                          q === 'all' || 
                          name.includes(q) || 
                          cat.includes(q) || 
                          (car.location && car.location.toLowerCase().includes(q));

      return fuelMatch && transMatch && seatMatch && budgetMatch && searchMatch;
    });

    return results;
  }, [displayCars, carCategoryFilter, carFilterFuel, carFilterTrans, searchQuery, appliedFilters]);

  const carsToRender = filteredCars;

  const [activeMediaIndexes, setActiveMediaIndexes] = useState({});

  const handlePrevMedia = (carId, mediaCount, e) => {
    e.stopPropagation();
    setActiveMediaIndexes(prev => {
      const curr = prev[carId] || 0;
      const nextIdx = (curr - 1 + mediaCount) % mediaCount;
      return { ...prev, [carId]: nextIdx };
    });
  };

  const handleNextMedia = (carId, mediaCount, e) => {
    e.stopPropagation();
    setActiveMediaIndexes(prev => {
      const curr = prev[carId] || 0;
      const nextIdx = (curr + 1) % mediaCount;
      return { ...prev, [carId]: nextIdx };
    });
  };

  const handleResetFilters = () => {
    if (setCarFilterFuel) setCarFilterFuel('All');
    if (setCarFilterTrans) setCarFilterTrans('All');
    setCarCategoryFilter('All');
    try { sessionStorage.removeItem('tg_carCategoryFilter'); } catch (e) {}
  };

  return (
    <div id="vehicles-fleet-view" className="animate-fade-in-up container px-3 px-md-0 pt-2" style={{ minHeight: '100vh' }}>
      
      {/* Back to Categories Navigation */}
      {onBack && (
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-outline-dark btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-xs font-heading fw-bold"
            onClick={onBack}
            style={{ background: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A' }}
          >
            <ChevronLeft size={16} />
            <span>← Back to Fleet Showcase</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="section-header mb-4 text-start">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="badge bg-warning text-dark rounded-pill px-3 py-1 text-xs fw-bold">
            🚖 Thailand Airport Pick &amp; Drop / Private Cabs
          </span>
          {carCategoryFilter !== 'All' && (
            <span className="badge rounded-pill px-2.5 py-1 text-xs fw-bold" style={{ background: '#0284C7', color: '#FFFFFF' }}>
              {carCategoryFilter}
            </span>
          )}
        </div>
        <h2 className="fs-3 fw-bold text-dark font-heading">
          {carCategoryFilter === 'VIP Vans' || carCategoryFilter === 'VIP Minivans'
            ? 'VIP Minivans & Group Transfers in Thailand'
            : carCategoryFilter === 'Sedans'
            ? 'Executive Airport Sedan Cabs in Thailand'
            : carCategoryFilter === 'SUVs' || carCategoryFilter === 'Family SUVs & MPVs'
            ? 'Family SUVs & MPVs Transfers in Thailand'
            : 'Airport Transfers & Chauffeur Cabs Fleet'}
        </h2>
        <p className="text-muted small mb-0">
          Showing {carsToRender.length} private chauffeur vehicles for Suvarnabhumi (BKK), Don Mueang (DMK), Phuket (HKT), Pattaya &amp; Chiang Mai.
        </p>
      </div>

      {/* Filter Bar with Category Tabs */}
      <div className="bg-white p-3 rounded-4 shadow-sm border mb-4">
        {/* Top Row: Category Tabs */}
        <div className="d-flex flex-wrap gap-2 align-items-center pb-3 border-bottom mb-3">
          <span className="text-muted small fw-bold me-2">Transfer Fleet:</span>
          {[
            { id: 'All', label: 'All Fleet', icon: '🚖' },
            { id: 'VIP Vans', label: 'VIP Minivans (9-12 Seater)', icon: '🚐' },
            { id: 'Sedans', label: 'Executive Sedans (4 Seater)', icon: '🚗' },
            { id: 'SUVs', label: 'Family SUVs & MPVs (7 Seater)', icon: '👑' }
          ].map(cat => {
            const isSelected = carCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`btn btn-sm rounded-pill px-3 fw-bold transition-all ${
                  isSelected ? 'btn-dark text-white shadow-xs' : 'btn-light border text-dark'
                }`}
                style={isSelected ? { background: '#0B192C', borderColor: '#0B192C' } : {}}
                onClick={() => {
                  setCarCategoryFilter(cat.id);
                  try { sessionStorage.setItem('tg_carCategoryFilter', cat.id); } catch (e) {}
                }}
              >
                <span className="me-1">{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Bottom Row: Fuel & Transmission Filters */}
        <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted small fw-bold me-1">Fuel:</span>
            {['All', 'Petrol', 'Diesel', 'Hybrid'].map(fuel => (
              <button
                key={fuel}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${carFilterFuel === fuel ? 'btn-primary' : 'btn-light border'}`}
                onClick={() => setCarFilterFuel && setCarFilterFuel(fuel)}
              >
                {fuel}
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted small fw-bold me-1">Transmission:</span>
            {['All', 'Automatic', 'Manual'].map(trans => (
              <button
                key={trans}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${carFilterTrans === trans ? 'btn-primary' : 'btn-light border'}`}
                onClick={() => setCarFilterTrans && setCarFilterTrans(trans)}
              >
                {trans}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="row g-4 mb-5">
        {carsToRender.length === 0 ? (
          <div className="col-12 text-center py-5 bg-white rounded-4 border shadow-sm">
            <h4 className="text-muted mb-2">No transfer vehicles available in this category.</h4>
            <button 
              type="button"
              className="btn btn-primary rounded-pill px-4 py-2 mt-2"
              onClick={handleResetFilters}
            >
              View All Transfer Cabs
            </button>
          </div>
        ) : (
          carsToRender.map(car => {
            const parsedImages = [];
            if (car.images_json) {
              try {
                const p = typeof car.images_json === 'string' ? JSON.parse(car.images_json) : car.images_json;
                if (Array.isArray(p)) parsedImages.push(...p);
              } catch (e) {}
            }
            if (car.mediaList && Array.isArray(car.mediaList)) {
              parsedImages.push(...car.mediaList.map(m => m?.url || m));
            }
            if (car.media_list && Array.isArray(car.media_list)) {
              parsedImages.push(...car.media_list.map(m => m?.url || m));
            }
            if (car.additional_images && Array.isArray(car.additional_images)) {
              parsedImages.push(...car.additional_images);
            }
            if (car.image && !car.image.includes('thailand_hero')) parsedImages.push(car.image);

            const mediaList = Array.from(new Set(parsedImages.filter(Boolean)));
            const activeIdx = activeMediaIndexes[car.id] || 0;
            const currentImg = mediaList[activeIdx] || car.image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80';

            return (
              <div key={car.id} className="col-md-6 col-lg-4">
                <div 
                  className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative hover-scale"
                  style={{ cursor: 'pointer', transition: 'all 0.25s ease' }}
                  onClick={() => {
                    if (document.activeElement?.blur) document.activeElement.blur();
                    if (onViewDetails) onViewDetails(car);
                  }}
                >
                  <div className="position-relative" style={{ height: '200px', background: '#f8fafc' }}>
                    <img 
                      src={currentImg} 
                      alt={car.name} 
                      className="w-100 h-100 object-fit-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallbackEl = e.target.parentElement.querySelector('.no-photo-fallback');
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="no-photo-fallback flex-column align-items-center justify-content-center w-100 h-100 text-muted" 
                      style={{ display: 'none', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
                    >
                      <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-xs" style={{ width: '44px', height: '44px', background: 'rgba(100,116,139,0.1)', border: '1px dashed rgba(100,116,139,0.25)' }}>
                        <Camera size={20} className="text-secondary opacity-75" />
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', letterSpacing: '0.2px' }}>Vehicle Image</span>
                    </div>
                    <div className="position-absolute top-0 start-0 m-2.5 d-flex flex-column gap-1 align-items-start" style={{ zIndex: 2 }}>
                      <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-2.5 py-1 small">
                        {car.category || 'Airport Cab'}
                      </span>
                    </div>
                    {mediaList.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle d-flex align-items-center justify-content-center opacity-75 shadow"
                          style={{ width: '26px', height: '26px', padding: 0, zIndex: 2 }}
                          onClick={(e) => handlePrevMedia(car.id, mediaList.length, e)}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle d-flex align-items-center justify-content-center opacity-75 shadow"
                          style={{ width: '26px', height: '26px', padding: 0, zIndex: 2 }}
                          onClick={(e) => handleNextMedia(car.id, mediaList.length, e)}
                        >
                          ›
                        </button>
                        <div className="position-absolute bottom-0 end-0 m-2 badge bg-dark bg-opacity-75 text-white rounded" style={{ zIndex: 2 }}>
                          📷 {activeIdx + 1} / {mediaList.length}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="card-body p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h5 className="fw-bold text-dark mb-0 font-heading" style={{ fontSize: '16.5px' }}>{car.name}</h5>
                        <div className="d-flex align-items-center gap-1 small">
                          <Star size={13} fill="#10B981" color="#10B981" />
                          <span className="fw-bold text-dark">{car.rating || 4.9}</span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge rounded-pill px-2 py-0.5 text-xxs fw-bold" style={{ background: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6' }}>
                          ✓ Private Chauffeur Included
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 text-muted small mb-2 flex-wrap" style={{ fontSize: '12px' }}>
                        <span>👥 {car.seating || '4-5 Seats'}</span>
                        <span>•</span>
                        <span>⛽ {car.fuel || 'Petrol'}</span>
                        <span>•</span>
                        <span>⚙️ {car.transmission || 'Automatic'}</span>
                      </div>

                      {/* Transfer Trust Badges */}
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        <span className="badge bg-light text-dark border px-2 py-1 text-xxs fw-semibold">
                          ❄️ Air Conditioned
                        </span>
                        <span className="badge bg-light text-success border px-2 py-1 text-xxs fw-semibold">
                          ✈️ Flight Tracking
                        </span>
                        <span className="badge bg-light text-primary border px-2 py-1 text-xxs fw-semibold">
                          🛣️ Tolls Included
                        </span>
                        <span className="badge bg-light text-secondary border px-2 py-1 text-xxs fw-semibold">
                          🛡️ Meet &amp; Greet
                        </span>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div>
                        <span className="text-muted small d-block" style={{ fontSize: '11px' }}>per transfer</span>
                        <h4 className="fw-black text-primary mb-0 font-heading">฿{Number(car.price || 0).toLocaleString('en-US')}</h4>
                      </div>
                      <div>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm rounded-pill px-3 py-1.5 fw-bold font-heading d-flex align-items-center gap-1 hover-scale shadow-sm"
                          style={{ background: '#FF6333', borderColor: '#FF6333', color: '#FFFFFF' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (document.activeElement?.blur) document.activeElement.blur();
                            if (handleOpenBooking) handleOpenBooking(car);
                            else if (onViewDetails) onViewDetails(car);
                          }}
                        >
                          <span>Book Transfer</span>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
