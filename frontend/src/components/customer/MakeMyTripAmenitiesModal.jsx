import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, CheckCircle2, Sparkles, Wifi, Wind, Tv, Coffee,
  Utensils, Wine, ShieldCheck, Car, Dumbbell, Sun, Bath,
  VolumeX, Bell, Shirt, Waves, Layers, Hotel, BedDouble, Info
} from 'lucide-react';

// Smart icon and color mapper based on amenity name keywords
function getAmenityMeta(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) {
    return { icon: <Wifi size={17} />, color: '#0284c7', bg: '#f0f9ff' };
  }
  if (lower.includes('pool') || lower.includes('jacuzzi')) {
    return { icon: <Waves size={17} />, color: '#0891b2', bg: '#ecfeff' };
  }
  if (lower.includes('beach') || lower.includes('deck') || lower.includes('sea') || lower.includes('ocean')) {
    return { icon: <Sun size={17} />, color: '#d97706', bg: '#fef3c7' };
  }
  if (lower.includes('ac') || lower.includes('air conditioning') || lower.includes('fan')) {
    return { icon: <Wind size={17} />, color: '#2563eb', bg: '#eff6ff' };
  }
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('dining') || lower.includes('kitchen') || lower.includes('meal')) {
    return { icon: <Utensils size={17} />, color: '#ea580c', bg: '#fff7ed' };
  }
  if (lower.includes('bar') || lower.includes('lounge') || lower.includes('cocktail') || lower.includes('wine') || lower.includes('beer')) {
    return { icon: <Wine size={17} />, color: '#e11d48', bg: '#fff1f2' };
  }
  if (lower.includes('breakfast') || lower.includes('coffee') || lower.includes('tea') || lower.includes('kettle')) {
    return { icon: <Coffee size={17} />, color: '#b45309', bg: '#fef3c7' };
  }
  if (lower.includes('tv') || lower.includes('television') || lower.includes('streaming')) {
    return { icon: <Tv size={17} />, color: '#475569', bg: '#f1f5f9' };
  }
  if (lower.includes('car') || lower.includes('parking') || lower.includes('valet')) {
    return { icon: <Car size={17} />, color: '#059669', bg: '#ecfdf5' };
  }
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout')) {
    return { icon: <Dumbbell size={17} />, color: '#7c3aed', bg: '#f5f3ff' };
  }
  if (lower.includes('security') || lower.includes('safe') || lower.includes('cctv') || lower.includes('lock')) {
    return { icon: <ShieldCheck size={17} />, color: '#059669', bg: '#ecfdf5' };
  }
  if (lower.includes('bath') || lower.includes('shower') || lower.includes('toiletries') || lower.includes('geyser') || lower.includes('hot water')) {
    return { icon: <Bath size={17} />, color: '#0284c7', bg: '#f0f9ff' };
  }
  if (lower.includes('soundproof')) {
    return { icon: <VolumeX size={17} />, color: '#64748b', bg: '#f8fafc' };
  }
  if (lower.includes('desk') || lower.includes('reception') || lower.includes('concierge') || lower.includes('bell')) {
    return { icon: <Bell size={17} />, color: '#d97706', bg: '#fef3c7' };
  }
  if (lower.includes('laundry') || lower.includes('iron') || lower.includes('wardrobe')) {
    return { icon: <Shirt size={17} />, color: '#64748b', bg: '#f8fafc' };
  }
  return { icon: <CheckCircle2 size={17} />, color: '#059669', bg: '#ecfdf5' };
}

export default function MakeMyTripAmenitiesModal({
  hotel,
  rooms = [],
  initialRoomId = null,
  onClose
}) {
  const [selectedTarget, setSelectedTarget] = useState(initialRoomId || 'hotel'); // 'hotel' or room_id
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const modalBodyRef = useRef(null);

  // Lock body scroll while modal is active
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Determine current active room if room target is selected
  const activeRoom = useMemo(() => {
    if (selectedTarget === 'hotel') return null;
    return rooms.find(r => r.id === selectedTarget) || null;
  }, [selectedTarget, rooms]);

  // Extract raw categorized amenities or synthesize from flat list
  const structuredCategories = useMemo(() => {
    let sourceCat = [];

    if (selectedTarget === 'hotel') {
      let raw = hotel.categorized_amenities || hotel.categorized_amenities_json;
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { raw = []; }
      }
      if (Array.isArray(raw) && raw.length > 0) {
        sourceCat = raw;
      } else {
        // Fallback from hotel flat amenities
        const flat = Array.isArray(hotel.amenities)
          ? hotel.amenities
          : (typeof hotel.amenities === 'string' ? hotel.amenities.split(',').map(s => s.trim()).filter(Boolean) : []);
        
        if (flat.length > 0) {
          sourceCat = [{
            category_id: 'cat_popular',
            category_name: 'Popular Amenities',
            items: flat.map(name => ({ name, is_custom: false }))
          }];
        }
      }
    } else if (activeRoom) {
      let raw = activeRoom.categorized_amenities || activeRoom.categorized_amenities_json;
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { raw = []; }
      }
      if (Array.isArray(raw) && raw.length > 0) {
        sourceCat = raw;
      } else {
        const flat = Array.isArray(activeRoom.amenities)
          ? activeRoom.amenities
          : (typeof activeRoom.amenities_json === 'string' ? JSON.parse(activeRoom.amenities_json || '[]') : []);
        if (flat.length > 0) {
          sourceCat = [{
            category_id: 'cat_room_features',
            category_name: 'Room Features & Amenities',
            items: flat.map(name => ({ name, is_custom: false }))
          }];
        }
      }
    }

    // Normalize and remove empty categories & duplicate items
    const normalized = [];
    const seenGlobal = new Set();

    (sourceCat || []).forEach(cat => {
      const catName = cat.category_name || cat.name || 'General Amenities';
      const catId = cat.category_id || cat.id || `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`;
      const rawItems = Array.isArray(cat.items) ? cat.items : (Array.isArray(cat.amenities) ? cat.amenities : []);

      const cleanItems = [];
      rawItems.forEach(item => {
        const name = typeof item === 'string' ? item : (item.name || '');
        const isCustom = typeof item === 'object' ? Boolean(item.is_custom) : false;
        if (name && !seenGlobal.has(name.toLowerCase())) {
          seenGlobal.add(name.toLowerCase());
          cleanItems.push({ name, is_custom: isCustom });
        }
      });

      if (cleanItems.length > 0) {
        normalized.push({
          category_id: catId,
          category_name: catName,
          items: cleanItems
        });
      }
    });

    return normalized;
  }, [hotel, selectedTarget, activeRoom]);

  // Total unique items count
  const totalItemsCount = useMemo(() => {
    return structuredCategories.reduce((sum, c) => sum + c.items.length, 0);
  }, [structuredCategories]);

  // Filtered categories based on active tab and search query
  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return structuredCategories.map(cat => {
      if (activeCategoryTab !== 'all' && cat.category_id !== activeCategoryTab) {
        return null;
      }

      const matchingItems = cat.items.filter(item => {
        if (!q) return true;
        return item.name.toLowerCase().includes(q) || cat.category_name.toLowerCase().includes(q);
      });

      if (matchingItems.length === 0) return null;

      return {
        ...cat,
        items: matchingItems
      };
    }).filter(Boolean);
  }, [structuredCategories, activeCategoryTab, searchTerm]);

  return createPortal(
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        background: 'rgba(13, 27, 46, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 10500,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-2xl d-flex flex-column overflow-hidden position-relative animate-in fade-in zoom-in-95"
        style={{
          width: '760px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-3.5 px-4 border-bottom bg-white d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <div className="p-2 rounded-3 text-white d-flex align-items-center justify-content-center shadow-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0D1B2E, #1F2937)' }}>
              <Sparkles size={18} className="text-warning" />
            </div>
            <div className="min-w-0">
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-black text-dark mb-0 font-heading text-truncate" style={{ fontSize: '1.15rem', letterSpacing: '-0.3px' }}>
                  Property &amp; Room Amenities
                </h4>
                <span className="badge bg-dark text-white rounded-pill px-2.5 py-0.5 text-xxs fw-bold flex-shrink-0">
                  {totalItemsCount} {totalItemsCount === 1 ? 'Total' : 'Total'}
                </span>
              </div>
              <p className="text-muted text-xs mb-0 mt-0.5 text-truncate">
                {hotel.name} · {hotel.location || 'Thailand'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-light rounded-circle p-2 text-muted hover-text-dark transition-all border flex-shrink-0 ms-2"
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close amenities modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scope Selector & Quick Search Bar */}
        <div className="px-4 py-2.5 bg-light bg-opacity-70 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2.5">
          {/* Scope Segmented Control */}
          <div className="d-flex align-items-center gap-2">
            <div className="btn-group btn-group-sm rounded-pill p-1 bg-white border shadow-xs">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1 fw-bold border-0 transition-all text-xs d-flex align-items-center gap-1.5 ${
                  selectedTarget === 'hotel' ? 'bg-dark text-white shadow-xs' : 'text-muted hover-text-dark'
                }`}
                onClick={() => { setSelectedTarget('hotel'); setActiveCategoryTab('all'); }}
              >
                <span>🏨 Hotel Amenities</span>
              </button>

              {rooms.length > 0 && (
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-bold border-0 transition-all text-xs d-flex align-items-center gap-1.5 ${
                    selectedTarget !== 'hotel' ? 'bg-dark text-white shadow-xs' : 'text-muted hover-text-dark'
                  }`}
                  onClick={() => { setSelectedTarget(rooms[0].id); setActiveCategoryTab('all'); }}
                >
                  <span>🛏️ Room Amenities ({rooms.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Room Selector if Room Amenities is active */}
          {selectedTarget !== 'hotel' && rooms.length > 0 && (
            <div className="d-flex align-items-center gap-1.5">
              <span className="text-muted text-xs fw-medium">Room:</span>
              <select
                className="form-select form-select-sm rounded-pill border-secondary border-opacity-25 fw-semibold text-xs py-1 ps-2.5 pe-4 bg-white shadow-xs"
                style={{ minWidth: '160px', maxWidth: '220px' }}
                value={selectedTarget}
                onChange={e => { setSelectedTarget(e.target.value); setActiveCategoryTab('all'); }}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Search Input */}
          <div className="input-group input-group-sm ms-auto" style={{ width: '220px' }}>
            <span className="input-group-text bg-white border-end-0 text-muted ps-2.5">
              <Search size={13} />
            </span>
            <input
              type="text"
              className="form-control form-control-sm border-start-0 ps-1 bg-white"
              placeholder="Search amenities..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.8rem' }}
            />
            {searchTerm && (
              <button
                className="btn btn-outline-secondary border-start-0 py-0 px-2 text-muted"
                onClick={() => setSearchTerm('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (Only show if multiple categories exist) */}
        {structuredCategories.length > 1 && (
          <div className="px-4 py-2 border-bottom bg-white d-flex align-items-center gap-1.5 flex-wrap overflow-auto">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-2.5 py-0.5 border transition-all text-xs fw-semibold ${
                activeCategoryTab === 'all'
                  ? 'btn-dark text-white shadow-xs'
                  : 'bg-light text-muted border-0 hover-text-dark'
              }`}
              onClick={() => setActiveCategoryTab('all')}
            >
              All ({totalItemsCount})
            </button>

            {structuredCategories.map(cat => {
              const isSelected = activeCategoryTab === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-0.5 border transition-all text-xs fw-semibold d-flex align-items-center gap-1.5 ${
                    isSelected
                      ? 'btn-dark text-white shadow-xs'
                      : 'bg-light text-muted border-0 hover-text-dark'
                  }`}
                  onClick={() => setActiveCategoryTab(cat.category_id)}
                >
                  {cat.category_name}
                  <span className={`badge rounded-pill text-xxs ${isSelected ? 'bg-white text-dark' : 'bg-white text-muted border'}`}>
                    {cat.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div
          ref={modalBodyRef}
          className="p-3.5 px-4 overflow-auto flex-grow-1"
          style={{ background: '#F8FAFC', scrollBehavior: 'smooth' }}
        >
          {filteredCategories.length === 0 ? (
            <div className="text-center py-5">
              <div className="p-3 rounded-circle bg-white shadow-xs d-inline-flex mb-3 text-muted">
                <Search size={26} />
              </div>
              <h6 className="fw-bold text-dark mb-1">No amenities found</h6>
              <p className="text-muted text-xs mb-3">
                No amenities match &ldquo;{searchTerm}&rdquo; in this section.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark rounded-pill px-3"
                onClick={() => { setSearchTerm(''); setActiveCategoryTab('all'); }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredCategories.map(cat => (
                <div
                  key={cat.category_id}
                  className="bg-white rounded-4 border p-3.5 shadow-xs transition-all"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  {/* Category Header */}
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                    <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2 font-heading" style={{ fontSize: '0.94rem' }}>
                      <span className="p-1 rounded-2 bg-amber-50 text-warning d-flex align-items-center justify-content-center">
                        <Layers size={14} />
                      </span>
                      {cat.category_name}
                    </h5>
                    <span className="badge bg-light text-muted border text-xxs px-2 py-0.5 rounded-pill fw-medium">
                      {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* 2-Column Responsive Grid of Amenities */}
                  <div className="row g-2">
                    {cat.items.map((item, idx) => {
                      const meta = getAmenityMeta(item.name);
                      return (
                        <div key={idx} className="col-12 col-md-6">
                          <div
                            className="p-2.5 px-3 rounded-3 border d-flex align-items-center justify-content-between gap-2.5 h-100 transition-all hover-border-slate-300"
                            style={{
                              background: '#FAFCFF',
                              borderColor: '#EDF2F7'
                            }}
                          >
                            <div className="d-flex align-items-center gap-2.5 min-w-0 flex-grow-1">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-2xs"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  background: meta.bg,
                                  color: meta.color
                                }}
                              >
                                {meta.icon}
                              </div>
                              <span
                                className="text-dark fw-semibold text-xs leading-snug"
                                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                              >
                                {item.name}
                              </span>
                            </div>

                            {item.is_custom && (
                              <span
                                className="badge bg-warning bg-opacity-15 text-dark border border-warning border-opacity-35 rounded-pill px-2 py-0.5 text-xxs fw-bold flex-shrink-0"
                                style={{ fontSize: '10px' }}
                              >
                                Hotel Exclusive
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 px-4 bg-white border-top d-flex align-items-center justify-content-between">
          <div className="text-muted text-xs d-flex align-items-center gap-1.5">
            <Info size={14} className="text-primary flex-shrink-0" />
            <span>Amenities verified for WOW THAILAND guests. Some premium items may incur nominal charges.</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-dark rounded-pill px-4 fw-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
