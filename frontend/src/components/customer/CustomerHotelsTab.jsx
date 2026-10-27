import React, { useState, useMemo } from 'react';
import {
  Hotel,
  MapPin,
  Star,
  Search,
  CheckCircle2,
  Eye,
  Calendar,
  Sparkles,
  Wifi,
  Coffee,
  Waves,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

const POPULAR_DESTINATIONS = [
  'All Thailand',
  'Bangkok',
  'Phuket',
  'Pattaya',
  'Krabi',
  'Koh Samui',
  'Chiang Mai'
];

export default function CustomerHotelsTab({
  currentUser,
  hotels = [],
  bookings = [],
  onViewDetails,
  onBook,
  onNavigateTab
}) {
  const [selectedCity, setSelectedCity] = useState('All Thailand');
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState('all');

  // Customer hotel bookings count
  const myHotelBookings = useMemo(() => {
    return (bookings || []).filter(b => {
      const type = String(b.package_type || b.type || '').toLowerCase();
      const itemId = String(b.item_id || '').toLowerCase();
      const name = String(b.item_name || b.package_name || b.hotel_name || '').toLowerCase();
      return type === 'hotel' || itemId.startsWith('hotel-') || itemId.startsWith('htl-') || name.includes('resort') || name.includes('hotel') || Boolean(b.hotel_id);
    });
  }, [bookings]);

  // Filtered hotel list
  const filteredHotels = useMemo(() => {
    return (hotels || []).filter(hotel => {
      // Exclude inactive
      if (hotel.is_active === 0 || hotel.is_active === '0' || hotel.is_active === false) {
        return false;
      }

      // City filter
      if (selectedCity !== 'All Thailand') {
        const loc = String(hotel.location || hotel.city || '').toLowerCase();
        if (!loc.includes(selectedCity.toLowerCase())) {
          return false;
        }
      }

      // Star filter
      if (starFilter !== 'all') {
        const stars = parseInt(hotel.stars || hotel.rating || 4, 10);
        if (starFilter === '5' && stars < 5) return false;
        if (starFilter === '4' && (stars < 4 || stars >= 5)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = String(hotel.name || '').toLowerCase();
        const loc = String(hotel.location || hotel.city || '').toLowerCase();
        const desc = String(hotel.description || '').toLowerCase();
        return name.includes(q) || loc.includes(q) || desc.includes(q);
      }

      return true;
    });
  }, [hotels, selectedCity, starFilter, searchQuery]);

  return (
    <div className="customer-hotels-tab animate-fade-in">
      {/* ─── Hero Header Banner ─── */}
      <div 
        className="card border-0 rounded-4 p-4 p-md-5 mb-4 shadow-sm text-white position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 60%, #000000 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="position-relative z-1" style={{ maxWidth: '750px' }}>
          <div className="d-inline-flex align-items-center gap-2 badge bg-warning text-dark fw-bold text-xxs px-3 py-1 rounded-pill mb-3 shadow-xs">
            <Sparkles size={13} className="text-dark" />
            <span>EXCLUSIVE HOTEL VENDOR INVENTORY</span>
          </div>
          <h2 className="fw-black display-6 font-heading mb-2 text-white">
            Thailand Luxury Hotels &amp; Beachfront Resorts
          </h2>
          <p className="text-white-50 text-sm mb-4">
            Direct partner rates from verified Thai hoteliers in Bangkok, Phuket, Pattaya, Krabi, and Koh Samui. Instant confirmation with zero platform markups.
          </p>

          <div className="d-flex flex-wrap gap-2">
            <span className="badge bg-white-10 text-white border border-white-20 px-3 py-1.5 rounded-pill text-xs">
              ⚡ Instant Confirmation Voucher
            </span>
            <span className="badge bg-white-10 text-white border border-white-20 px-3 py-1.5 rounded-pill text-xs">
              🏊 Infinity Pool &amp; Beach Access
            </span>
            <span className="badge bg-white-10 text-white border border-white-20 px-3 py-1.5 rounded-pill text-xs">
              🥐 Complimentary Breakfast
            </span>
            <span className="badge bg-white-10 text-white border border-white-20 px-3 py-1.5 rounded-pill text-xs">
              🛡️ Verified Hotel Vendor PMS
            </span>
          </div>
        </div>

        {/* Quick Hotel Bookings Pill */}
        {myHotelBookings.length > 0 && (
          <div className="position-absolute bottom-0 end-0 m-4 d-none d-md-block">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('bookings', 'hotel')}
              className="btn btn-warning text-dark fw-bold rounded-pill px-3 py-2 text-xs shadow-sm d-flex align-items-center gap-2"
            >
              <Calendar size={15} />
              <span>You Have {myHotelBookings.length} Hotel Reservation{myHotelBookings.length > 1 ? 's' : ''} →</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Search & Destination Filter Bar ─── */}
      <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white" style={{ border: '1px solid #eef2f6' }}>
        <div className="row g-3 align-items-center mb-3">
          {/* Search input */}
          <div className="col-12 col-md-6 col-lg-7">
            <div className="input-group">
              <span className="input-group-text bg-light border-0 ps-3">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control bg-light border-0 py-2.5 text-xs text-dark"
                placeholder="Search resort name, location, or amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-light border-0 text-muted"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Star Filter */}
          <div className="col-12 col-md-6 col-lg-5">
            <div className="d-flex align-items-center justify-content-md-end gap-2">
              <span className="text-xs text-muted fw-bold d-flex align-items-center gap-1">
                <Filter size={14} /> Star Class:
              </span>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn text-xs fw-bold ${starFilter === 'all' ? 'btn-dark' : 'btn-light text-secondary'}`}
                  onClick={() => setStarFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn text-xs fw-bold ${starFilter === '5' ? 'btn-warning text-dark' : 'btn-light text-secondary'}`}
                  onClick={() => setStarFilter('5')}
                >
                  5★ Luxury
                </button>
                <button
                  type="button"
                  className={`btn text-xs fw-bold ${starFilter === '4' ? 'btn-warning text-dark' : 'btn-light text-secondary'}`}
                  onClick={() => setStarFilter('4')}
                >
                  4★ Premium
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* City Filter Chips */}
        <div className="d-flex flex-wrap gap-2 pt-2 border-top">
          {POPULAR_DESTINATIONS.map((city) => {
            const isSelected = selectedCity === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`btn btn-sm rounded-pill px-3 py-1.5 text-xs fw-bold transition-all ${
                  isSelected
                    ? 'btn-primary text-white shadow-xs'
                    : 'btn-light text-secondary hover-text-dark'
                }`}
              >
                📍 {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Hotels Listing Grid ─── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-black text-dark mb-0 font-heading" style={{ fontSize: '18px' }}>
            Verified Partner Hotels &amp; Resorts
          </h5>
          <span className="text-muted text-xxs">
            Showing {filteredHotels.length} propert{filteredHotels.length === 1 ? 'y' : 'ies'} in {selectedCity}
          </span>
        </div>
      </div>

      {filteredHotels.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white" style={{ border: '1px solid #eef2f6' }}>
          <div className="rounded-circle p-3 bg-light text-warning d-inline-flex mx-auto mb-3">
            <Hotel size={40} />
          </div>
          <h5 className="fw-bold text-dark mb-1 font-heading">No Hotels Match Your Search</h5>
          <p className="text-muted text-xs mb-3">
            Try adjusting your search keywords, clearing filters, or exploring all of Thailand.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark rounded-pill px-4 py-2 text-xs fw-bold mx-auto"
            onClick={() => { setSelectedCity('All Thailand'); setSearchQuery(''); setStarFilter('all'); }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {filteredHotels.map((hotel, idx) => {
            const hotelImg = hotel.image || hotel.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
            const priceNum = Number(hotel.price || hotel.selling_price || 1800);
            const stars = hotel.stars || hotel.rating || 5;

            return (
              <div key={hotel.id || idx} className="col-12 col-md-6 col-xl-4">
                <div 
                  className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden bg-white hover-shadow transition-all d-flex flex-column"
                  style={{ border: '1px solid #eef2f6' }}
                >
                  {/* Hotel Image Card */}
                  <div 
                    className="position-relative cursor-pointer overflow-hidden" 
                    style={{ height: '190px' }}
                    onClick={() => onViewDetails && onViewDetails(hotel)}
                  >
                    <img 
                      src={hotelImg} 
                      alt={hotel.name} 
                      className="w-100 h-100 object-fit-cover transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="position-absolute top-0 start-0 m-2.5 d-flex gap-1.5 flex-wrap">
                      <span className="badge bg-primary text-white text-xxs px-2.5 py-1 rounded-pill fw-bold shadow-sm">
                        🏨 Verified Stay
                      </span>
                      {hotel.property_type && (
                        <span className="badge bg-dark bg-opacity-75 text-white text-xxs px-2 py-1 rounded-pill">
                          {hotel.property_type}
                        </span>
                      )}
                    </div>
                    <span className="position-absolute bottom-0 end-0 m-2.5 badge bg-dark bg-opacity-80 text-warning text-xxs px-2.5 py-1 rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1">
                      <Star size={12} fill="#ffc107" />
                      <span>{stars}★ Luxury</span>
                    </span>
                  </div>

                  {/* Hotel Body */}
                  <div className="card-body p-3 d-flex flex-column justify-content-between flex-grow-1">
                    <div>
                      <h6 
                        className="fw-black text-dark mb-1 font-heading text-truncate cursor-pointer hover-text-primary" 
                        title={hotel.name}
                        onClick={() => onViewDetails && onViewDetails(hotel)}
                        style={{ fontSize: '15px' }}
                      >
                        {hotel.name}
                      </h6>

                      <div className="d-flex align-items-center gap-1 text-muted text-xxs mb-2">
                        <MapPin size={13} className="text-primary flex-shrink-0" />
                        <span className="text-truncate">{hotel.location || hotel.city || 'Bangkok & Pattaya, Thailand'}</span>
                      </div>

                      <p className="text-muted text-xxs mb-2.5 line-clamp-2" style={{ minHeight: '32px', lineHeight: 1.4 }}>
                        {hotel.description || 'Luxury resort property offering premier air-conditioned guest suites, swimming pool, multi-cuisine restaurant, and 24/7 reception.'}
                      </p>

                      {/* Amenities Pills */}
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        <span className="badge bg-light text-dark border text-xxs px-2 py-0.5 rounded-pill d-flex align-items-center gap-1">
                          <Waves size={10} className="text-primary" /> Pool
                        </span>
                        <span className="badge bg-light text-dark border text-xxs px-2 py-0.5 rounded-pill d-flex align-items-center gap-1">
                          <Wifi size={10} className="text-success" /> Free WiFi
                        </span>
                        <span className="badge bg-light text-dark border text-xxs px-2 py-0.5 rounded-pill d-flex align-items-center gap-1">
                          <Coffee size={10} className="text-warning" /> Breakfast
                        </span>
                        <span className="badge bg-light text-dark border text-xxs px-2 py-0.5 rounded-pill d-flex align-items-center gap-1">
                          <ShieldCheck size={10} className="text-info" /> 24/7 PMS
                        </span>
                      </div>
                    </div>

                    {/* Price and Action Buttons */}
                    <div className="pt-2 border-top">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                          <span className="text-xxs text-muted">Per Night From</span>
                          <div className="fs-5 fw-black text-primary font-heading lh-1">
                            ฿{priceNum.toLocaleString()}
                          </div>
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success text-xxs px-2 py-1 rounded-pill fw-bold">
                          ✓ Free Cancellation
                        </span>
                      </div>

                      <div className="row g-2">
                        <div className="col-6">
                          <button
                            type="button"
                            onClick={() => onViewDetails && onViewDetails(hotel)}
                            className="btn btn-sm btn-outline-dark rounded-pill w-100 py-1.5 text-xs fw-bold d-flex align-items-center justify-content-center gap-1"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </div>
                        <div className="col-6">
                          <button
                            type="button"
                            onClick={() => onBook && onBook(hotel)}
                            className="btn btn-sm btn-warning text-dark rounded-pill w-100 py-1.5 text-xs fw-black shadow-sm d-flex align-items-center justify-content-center gap-1"
                          >
                            <span>Book Now →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
