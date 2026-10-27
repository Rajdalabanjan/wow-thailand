import React, { useState, useMemo, useEffect } from 'react';
import { Star, TrendingUp, ShieldCheck, Award, Clock, Filter, AlertCircle, RotateCcw, ChevronLeft, ChevronRight, Camera, RotateCw } from 'lucide-react';
import { getMarkupPrice } from '../../utils/pricingHelper';

const DEFAULT_TWO_WHEELERS = [
  {
    id: 'bike-def-1',
    name: 'Honda PCX 160 eSP+',
    category: 'Cruiser',
    price: 500,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=1200&q=80'
    ],
    fuel: 'Petrol',
    engine: '350cc',
    type: 'bike'
  },
  {
    id: 'bike-def-2',
    name: 'Honda Click 125i',
    category: 'Sports',
    price: 450,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '155cc',
    type: 'bike'
  },
  {
    id: 'bike-def-3',
    name: 'Honda PCX 160',
    category: 'Scooter',
    price: 300,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '110cc',
    type: 'bike'
  },
  {
    id: 'bike-def-4',
    name: 'Honda Click 125i',
    category: 'Scooter',
    price: 350,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '125cc',
    type: 'bike'
  },
  {
    id: 'bike-def-5',
    name: 'Vespa Sprint 150',
    category: 'Scooter',
    price: 350,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '125cc',
    type: 'bike'
  },
  {
    id: 'bike-def-6',
    name: 'Yamaha NMAX 155',
    category: 'Sports',
    price: 400,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '200cc',
    type: 'bike'
  },
  {
    id: 'bike-def-7',
    name: 'Yamaha NMAX 155 ABS',
    category: 'Adventure',
    price: 1100,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '450cc',
    type: 'bike'
  },
  {
    id: 'bike-def-8',
    name: 'Honda Forza 350',
    category: 'Superbike',
    price: 4000,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    fuel: 'Petrol',
    engine: '1000cc',
    type: 'bike'
  }
];

export default function BikesPage({
  onBack,
  bikeFilterType = 'All',
  setBikeFilterType,
  handleOpenBooking,
  onViewDetails,
  bikes = [],
  searchQuery,
  markups = [],
  appliedFilters = {},
  setAppliedFilters
}) {
  const displayBikes = useMemo(() => {
    const isAvailableItem = (b) => b && b.is_available !== 0 && b.is_available !== '0' && b.is_available !== false;
    const liveBikes = (bikes || []).filter(isAvailableItem).map(bike => ({
      ...bike,
      type: 'bike',
      price: getMarkupPrice(parseFloat(bike.price || 0), bike.vendor_id || 'global', 'bikes', bike.id, markups, 'b2c')
    }));

    const namesSeen = new Set();
    const result = [];
    liveBikes.forEach(b => {
      if (b.name && !namesSeen.has(b.name.toLowerCase().trim())) {
        namesSeen.add(b.name.toLowerCase().trim());
        result.push(b);
      }
    });

    if (result.length === 0) {
      DEFAULT_TWO_WHEELERS.forEach(b => {
        if (!namesSeen.has(b.name.toLowerCase().trim())) {
          namesSeen.add(b.name.toLowerCase().trim());
          result.push(b);
        }
      });
    }

    return result;
  }, [bikes, markups]);

  const filteredBikes = useMemo(() => {
    const bikeSubs = appliedFilters?.bikeSubFilters || [];
    const appBudget = appliedFilters?.vehicleBudget || [];

    const results = displayBikes.filter(bike => {
      const bCat = (bike.category || '').toLowerCase();
      const bName = (bike.name || '').toLowerCase();
      const bFuel = (bike.fuel || '').toLowerCase();
      const price = parseFloat(bike.price || 0);
      const selCat = (bikeFilterType || 'All').toLowerCase();

      const typeMatch = selCat === 'all' 
        || bCat === selCat 
        || bCat.includes(selCat) 
        || selCat.includes(bCat)
        || (selCat.includes('scooter') && bCat.includes('scooter'))
        || (selCat.includes('sports') && bCat.includes('sports'))
        || (selCat.includes('cruiser') && bCat.includes('cruiser'));

      const subMatch = bikeSubs.length === 0 || bikeSubs.some(sub => {
        const s = sub.toLowerCase();
        if (s.includes('scooter')) return bCat.includes('scooter') || bName.includes('activa') || bName.includes('jupiter') || bName.includes('access');
        if (s.includes('cruiser') || s.includes('enfield')) return bCat.includes('cruiser') || bName.includes('classic') || bName.includes('bullet') || bName.includes('hunter') || bName.includes('meteor') || bName.includes('himalayan');
        if (s.includes('sports')) return bCat.includes('sports') || bCat.includes('superbike') || bName.includes('r15') || bName.includes('ktm') || bName.includes('duke') || bName.includes('pulsar') || bName.includes('ninja');
        if (s.includes('electric') || s.includes('ev')) return bFuel.includes('electric') || bFuel.includes('ev') || bName.includes('ev') || bName.includes('ather') || bName.includes('ola');
        return bCat.includes(s) || bName.includes(s);
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
                          q === 'All Thailand' || 
                          q === 'all' || 
                          q === 'india' ||
                          bName.includes(q) || 
                          bCat.includes(q) || 
                          (bike.location && bike.location.toLowerCase().includes(q));
      return typeMatch && subMatch && budgetMatch && searchMatch;
    });

    return results;
  }, [displayBikes, bikeFilterType, searchQuery, appliedFilters]);

  const bikesToRender = filteredBikes;

  const [activeMediaIndexes, setActiveMediaIndexes] = useState({});

  const handlePrevMedia = (bikeId, mediaCount, e) => {
    e.stopPropagation();
    setActiveMediaIndexes(prev => {
      const curr = prev[bikeId] || 0;
      const nextIdx = (curr - 1 + mediaCount) % mediaCount;
      return { ...prev, [bikeId]: nextIdx };
    });
  };

  const handleNextMedia = (bikeId, mediaCount, e) => {
    e.stopPropagation();
    setActiveMediaIndexes(prev => {
      const curr = prev[bikeId] || 0;
      const nextIdx = (curr + 1) % mediaCount;
      return { ...prev, [bikeId]: nextIdx };
    });
  };

  const handleResetFilters = () => {
    if (setBikeFilterType) setBikeFilterType('All');
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
  }, []);

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
            <span>← Back to Vehicle Categories</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="section-header mb-4 text-start">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="badge rounded-pill px-2.5 py-1 text-xs fw-bold" style={{ background: '#FF6026', color: '#FFFFFF' }}>
            🛵 Two Wheelers Fleet
          </span>
        </div>
        <h2 className="fs-3 fw-bold text-dark font-heading">Self Drive Bikes &amp; Scooters in Thailand</h2>
        <p className="text-muted small mb-0">
          Showing {bikesToRender.length} verified scooters, cruisers &amp; sports bikes with complimentary helmets and insurance.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border">
        <span className="text-muted small fw-bold me-2">Category:</span>
        {['All', 'Scooter / Moped', 'Sports Bike', 'Cruiser', 'Standard'].map(cat => (
          <button
            key={cat}
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${bikeFilterType === cat ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setBikeFilterType && setBikeFilterType(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bike Grid */}
      <div className="row g-4 mb-5">
        {bikesToRender.length === 0 ? (
          <div className="col-12 text-center py-5 bg-white rounded-4 border shadow-sm">
            <h4 className="text-muted mb-2">No rental bikes available in this category.</h4>
            <button 
              type="button"
              className="btn btn-primary rounded-pill px-4 py-2 mt-2"
              onClick={handleResetFilters}
            >
              View All Bikes
            </button>
          </div>
        ) : (
          bikesToRender.map(bike => {
            const parsedImages = [];
            if (bike.images_json) {
              try {
                const p = typeof bike.images_json === 'string' ? JSON.parse(bike.images_json) : bike.images_json;
                if (Array.isArray(p)) parsedImages.push(...p);
              } catch (e) {}
            }
            if (bike.mediaList && Array.isArray(bike.mediaList)) {
              parsedImages.push(...bike.mediaList.map(m => m?.url || m));
            }
            if (bike.media_list && Array.isArray(bike.media_list)) {
              parsedImages.push(...bike.media_list.map(m => m?.url || m));
            }
            if (bike.additional_images && Array.isArray(bike.additional_images)) {
              parsedImages.push(...bike.additional_images);
            }
            if (bike.image) parsedImages.push(bike.image);

            const mediaList = Array.from(new Set(parsedImages.filter(Boolean)));
            const activeIdx = activeMediaIndexes[bike.id] || 0;
            const currentImg = mediaList[activeIdx] || bike.image || '';

            return (
              <div key={bike.id} className="col-md-6 col-lg-4">
                <div 
                  className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative hover-scale"
                  style={{ cursor: 'pointer', transition: 'all 0.25s ease' }}
                  onClick={() => {
                    if (document.activeElement?.blur) document.activeElement.blur();
                    if (onViewDetails) onViewDetails({ ...bike, type: 'bike' });
                  }}
                >
                  <div className="position-relative" style={{ height: '200px', background: '#f8fafc' }}>
                    {currentImg ? (
                      <img 
                        src={currentImg} 
                        alt={bike.name} 
                        className="w-100 h-100 object-fit-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallbackEl = e.target.parentElement.querySelector('.no-photo-fallback');
                          if (fallbackEl) fallbackEl.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="no-photo-fallback flex-column align-items-center justify-content-center w-100 h-100 text-muted" 
                      style={{ display: currentImg ? 'none' : 'flex', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
                    >
                      <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-xs" style={{ width: '44px', height: '44px', background: 'rgba(100,116,139,0.1)', border: '1px dashed rgba(100,116,139,0.25)' }}>
                        <Camera size={20} className="text-secondary opacity-75" />
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', letterSpacing: '0.2px' }}>No Photo Uploaded</span>
                    </div>
                    <div className="position-absolute top-0 start-0 m-2.5 d-flex flex-column gap-1 align-items-start" style={{ zIndex: 2 }}>
                      <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-2.5 py-1 small">
                        {bike.category || 'Scooter'}
                      </span>
                    </div>
                    {mediaList.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle d-flex align-items-center justify-content-center opacity-75 shadow"
                          style={{ width: '26px', height: '26px', padding: 0, zIndex: 2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevMedia(bike.id, mediaList.length, e);
                          }}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle d-flex align-items-center justify-content-center opacity-75 shadow"
                          style={{ width: '26px', height: '26px', padding: 0, zIndex: 2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextMedia(bike.id, mediaList.length, e);
                          }}
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
                        <h5 className="fw-bold text-dark mb-0 font-heading">{bike.name}</h5>
                        <div className="d-flex align-items-center gap-1 small">
                          <Star size={13} fill="#10B981" color="#10B981" />
                          <span className="fw-bold text-dark">{bike.rating || 4.8}</span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge rounded-pill px-2 py-0.5 text-xxs fw-bold" style={{ background: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6' }}>
                          ✓ Available Now
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 text-muted small mb-2 flex-wrap">
                        {bike.engine && <span>⚡ {bike.engine}</span>}
                        {bike.engine && bike.fuel && <span>•</span>}
                        {bike.fuel && <span>⛽ {bike.fuel}</span>}
                        {(bike.engine || bike.fuel) && <span>•</span>}
                        <span>📍 {bike.location || 'Thailand Delivery'}</span>
                      </div>

                      {/* Rental Trust Badges */}
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        <span className="badge bg-light text-dark border px-2 py-1 text-xxs fw-semibold">
                          🪖 {bike.helmets_included !== undefined && bike.helmets_included !== null && bike.helmets_included !== '' ? bike.helmets_included : 2} Helmets
                        </span>
                        <span className="badge bg-light text-dark border px-2 py-1 text-xxs fw-semibold">
                          💰 ฿{Number(bike.security_deposit || 1000).toLocaleString('en-US')} Deposit
                        </span>
                        <span className="badge bg-light text-success border px-2 py-1 text-xxs fw-semibold">
                          🛣️ {bike.km_limit || 'Unlimited Kms'}
                        </span>
                        {(bike.has_mobile_holder == 1 || bike.has_mobile_holder === true || bike.has_mobile_holder === '1') && (
                          <span className="badge bg-light text-primary border px-2 py-1 text-xxs fw-semibold">
                            📱 Phone Mount
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div>
                        <span className="text-muted small d-block">per day</span>
                        <h4 className="fw-black text-primary mb-0 font-heading">฿{Number(bike.price).toLocaleString('en-US')}</h4>
                      </div>
                      <div>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm rounded-pill px-3 py-1.5 fw-bold font-heading d-flex align-items-center gap-1 hover-scale shadow-sm"
                          style={{ background: '#FF6333', borderColor: '#FF6333', color: '#FFFFFF' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (document.activeElement?.blur) document.activeElement.blur();
                            if (onViewDetails) onViewDetails({ ...bike, type: 'bike' });
                          }}
                        >
                          <span>Select Bike</span>
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
