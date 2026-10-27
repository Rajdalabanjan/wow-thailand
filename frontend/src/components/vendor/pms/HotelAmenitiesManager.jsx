import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Check, Plus, Search, Filter, RefreshCw, X, AlertCircle,
  CheckCircle2, Clock, Info, Shield, Layers, Hotel, Tag
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../../services/api';

export default function HotelAmenitiesManager({ currentUser, vendorHotels = [], selectedHotelId: initialHotelId }) {
  const [selectedHotelId, setSelectedHotelId] = useState(() => {
    return initialHotelId || vendorHotels[0]?.id || '';
  });

  const [hotelRooms, setHotelRooms] = useState([]);
  const [targetScope, setTargetScope] = useState('hotel'); // 'hotel' | room_type_id
  const [hotelDataCache, setHotelDataCache] = useState({ hotel: null, rooms: [] });

  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]); // Array of amenity names or IDs
  const [customItems, setCustomItems] = useState([]); // Hotel-specific custom items: [{ name, category_id }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [alertMsg, setAlertMsg] = useState(null);

  // Custom Item Modal (Immediate hotel-specific save)
  const [customItemModal, setCustomItemModal] = useState({ open: false, categoryId: '' });
  const [customItemName, setCustomItemName] = useState('');

  // Global Request Modal (Submitted to admin for platform-wide availability)
  const [requestModal, setRequestModal] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestCategory, setRequestCategory] = useState('');
  const [requestScope, setRequestScope] = useState('hotel');
  const [requestDescription, setRequestDescription] = useState('');

  useEffect(() => {
    if (!selectedHotelId && vendorHotels.length > 0) {
      setSelectedHotelId(vendorHotels[0].id);
    }
  }, [vendorHotels]);

  const showAlert = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const parseScopeAmenities = (scope, hotelObj, roomsArr) => {
    const activeNames = [];
    const customList = [];

    if (scope === 'hotel') {
      if (hotelObj) {
        let catJson = hotelObj.categorized_amenities_json;
        if (typeof catJson === 'string') {
          try { catJson = JSON.parse(catJson); } catch (e) { catJson = []; }
        }

        if (Array.isArray(catJson) && catJson.length > 0) {
          catJson.forEach(cat => {
            if (cat.items && Array.isArray(cat.items)) {
              cat.items.forEach(item => {
                const name = typeof item === 'string' ? item : (item.name || '');
                if (name) {
                  activeNames.push(name);
                  if (item.is_custom) {
                    customList.push({ name, category_id: cat.category_id || cat.id || 'cat_popular' });
                  }
                }
              });
            } else if (typeof cat === 'string') {
              activeNames.push(cat);
            }
          });
        } else if (hotelObj.amenities) {
          const legacy = Array.isArray(hotelObj.amenities) ? hotelObj.amenities : hotelObj.amenities.split(',').map(s => s.trim());
          legacy.forEach(a => { if (a) activeNames.push(a); });
        }
      }
    } else {
      // Room scope
      const room = (roomsArr || []).find(r => r.id === scope);
      if (room) {
        let catJson = room.categorized_amenities_json;
        if (typeof catJson === 'string') {
          try { catJson = JSON.parse(catJson); } catch (e) { catJson = []; }
        }

        if (Array.isArray(catJson) && catJson.length > 0) {
          catJson.forEach(cat => {
            if (cat.items && Array.isArray(cat.items)) {
              cat.items.forEach(item => {
                const name = typeof item === 'string' ? item : (item.name || '');
                if (name) {
                  activeNames.push(name);
                  if (item.is_custom) {
                    customList.push({ name, category_id: cat.category_id || cat.id || 'cat_popular' });
                  }
                }
              });
            } else if (typeof cat === 'string') {
              activeNames.push(cat);
            }
          });
        } else if (room.amenities_json || room.amenities) {
          const raw = room.amenities_json || room.amenities;
          let legacy = [];
          if (Array.isArray(raw)) legacy = raw;
          else if (typeof raw === 'string') {
            try { legacy = JSON.parse(raw); } catch (e) { legacy = raw.split(',').map(s => s.trim()); }
          }
          (Array.isArray(legacy) ? legacy : []).forEach(a => { if (a) activeNames.push(a); });
        }
      }
    }

    setSelectedAmenities(Array.from(new Set(activeNames)));
    setCustomItems(customList);
  };

  const handleSwitchScope = (newScope) => {
    setTargetScope(newScope);
    parseScopeAmenities(newScope, hotelDataCache.hotel, hotelDataCache.rooms);
    // Adjust request scope default
    setRequestScope(newScope === 'hotel' ? 'hotel' : 'room');
  };

  const loadData = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {};

      // 1. Fetch categories & master amenities
      const catRes = await apiFetch(`${API_BASE}?resource=hotel_amenity_categories`, { headers });
      const catData = await catRes.json();
      if (catData.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
        if (!requestCategory && catData.categories[0]) {
          setRequestCategory(catData.categories[0].id);
        }
      }

      // 2. Fetch vendor's amenity requests
      const reqRes = await apiFetch(`${API_BASE}?resource=pms_list_amenity_requests`, { headers });
      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.requests)) {
        setRequests(reqData.requests.filter(r => r.hotel_id === selectedHotelId));
      }

      // 3. Fetch current hotel's details and rooms
      const hotelRes = await apiFetch(`${API_BASE}?resource=hotel_rooms_public&hotel_id=${encodeURIComponent(selectedHotelId)}`, { headers });
      const hotelData = await hotelRes.json();
      if (hotelData.success) {
        const hotelObj = hotelData.hotel || null;
        const roomsArr = Array.isArray(hotelData.rooms) ? hotelData.rooms : [];
        setHotelRooms(roomsArr);
        setHotelDataCache({ hotel: hotelObj, rooms: roomsArr });

        parseScopeAmenities(targetScope, hotelObj, roomsArr);
      }
    } catch (err) {
      console.error('Failed to load amenities:', err);
      showAlert('Failed to load amenities data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedHotelId]);

  const handleToggleAmenity = (name) => {
    if (selectedAmenities.includes(name)) {
      setSelectedAmenities(selectedAmenities.filter(n => n !== name));
    } else {
      setSelectedAmenities([...selectedAmenities, name]);
    }
  };

  // Add hotel-specific custom item (immediately available to this hotel/room)
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    const name = customItemName.trim();
    if (!name) return;

    if (!selectedAmenities.includes(name)) {
      setSelectedAmenities([...selectedAmenities, name]);
    }

    const catId = customItemModal.categoryId || categories[0]?.id || 'cat_popular';
    if (!customItems.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      setCustomItems([...customItems, { name, category_id: catId }]);
    }

    setCustomItemName('');
    setCustomItemModal({ open: false, categoryId: '' });
    showAlert(`Added "${name}" to your ${targetScope === 'hotel' ? 'hotel' : 'room'} amenities.`);
  };

  // Submit request for platform-wide reuse (admin approval workflow)
  const handleSubmitGlobalRequest = async (e) => {
    e.preventDefault();
    if (!requestName.trim()) {
      alert('Please enter amenity name.');
      return;
    }
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const payload = {
        action: 'pms_request_custom_amenity',
        auth_token: token,
        hotel_id: selectedHotelId,
        custom_name: requestName.trim(),
        suggested_category_id: requestCategory,
        scope: requestScope,
        description: requestDescription.trim()
      };

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Custom amenity request submitted for admin review!');
        // Also auto-select it locally so vendor has it immediately
        if (!selectedAmenities.includes(requestName.trim())) {
          setSelectedAmenities([...selectedAmenities, requestName.trim()]);
        }
        setRequestModal(false);
        setRequestName('');
        setRequestDescription('');
        loadData();
      } else {
        alert(data.error || 'Failed to submit request');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Save full categorized amenities to hotel or specific room type
  const handleSaveAmenities = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

      // Build structured categorized amenities array
      const structured = categories.map(cat => {
        const catAmenities = (cat.amenities || []).map(a => a.name);
        const catCustoms = customItems.filter(i => i.category_id === cat.id).map(i => i.name);

        const allInCat = Array.from(new Set([...catAmenities, ...catCustoms]));
        const selectedInCat = allInCat.filter(name => selectedAmenities.includes(name));

        return {
          category_id: cat.id,
          category_name: cat.name,
          scope: cat.scope || 'hotel',
          items: selectedInCat.map(name => ({
            name,
            is_custom: catCustoms.includes(name)
          }))
        };
      }).filter(c => c.items.length > 0);

      const isHotel = targetScope === 'hotel';
      const payload = isHotel ? {
        action: 'pms_save_hotel_categorized_amenities',
        auth_token: token,
        hotel_id: selectedHotelId,
        categorized_amenities: structured
      } : {
        action: 'pms_save_room_categorized_amenities',
        auth_token: token,
        hotel_id: selectedHotelId,
        room_type_id: targetScope,
        categorized_amenities: structured
      };

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        const targetLabel = isHotel ? 'Hotel' : (hotelRooms.find(r => r.id === targetScope)?.name || 'Room');
        showAlert(data.message || `${targetLabel} amenities saved and synchronized successfully!`);
        loadData();
      } else {
        alert(data.error || 'Failed to save amenities');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.map(cat => {
      const catCustoms = customItems.filter(i => i.category_id === cat.id).map(i => ({
        id: `custom_${i.name}`,
        name: i.name,
        is_custom: true,
        category_id: cat.id
      }));

      const allItems = [...(cat.amenities || []), ...catCustoms];

      const filteredItems = allItems.filter(item => {
        return !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      });

      return {
        ...cat,
        itemsToDisplay: filteredItems,
        matchesTab: selectedCategoryTab === 'all' || cat.id === selectedCategoryTab
      };
    }).filter(c => c.matchesTab && c.itemsToDisplay.length > 0);
  }, [categories, customItems, searchTerm, selectedCategoryTab]);

  return (
    <div className="p-3 p-lg-4" style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* Toast Alert */}
      {alertMsg && (
        <div
          className={`position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg alert alert-${alertMsg.type} d-flex align-items-center gap-2`}
          style={{ zIndex: 1090, borderRadius: '12px', minWidth: '320px' }}
        >
          {alertMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="fw-semibold">{alertMsg.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-2.5">
          <div className="rounded-3 p-2 d-flex align-items-center justify-content-center text-white" style={{ background: 'linear-gradient(135deg, #FF6333, #FF8A00)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#0D1B2E' }}>Hotel Amenities</h4>
            <p className="text-muted small mb-0">Select master amenities, add custom items, or request global review</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {vendorHotels.length > 1 && (
            <select
              className="form-select form-select-sm rounded-pill fw-bold border-secondary border-opacity-25"
              style={{ width: '220px', fontSize: '0.82rem' }}
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
            >
              {vendorHotels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-3"
            onClick={loadData}
            disabled={loading || saving}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-dark rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
            onClick={() => setRequestModal(true)}
          >
            <Plus size={14} /> Request New Amenity
          </button>

          <button
            type="button"
            className="btn btn-sm text-white rounded-pill px-4 fw-bold"
            style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
            onClick={handleSaveAmenities}
            disabled={saving}
          >
            {saving ? 'Saving...' : `Save Amenities (${selectedAmenities.length})`}
          </button>
        </div>
      </div>

      {/* Scope Selector: Hotel-Level vs Room-Level */}
      <div className="bg-white rounded-4 border p-3 mb-4 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted fw-semibold small">Amenity Target:</span>
          <div className="btn-group btn-group-sm p-1 rounded-pill" style={{ background: '#f1f3f5' }}>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-bold border-0 transition-all ${targetScope === 'hotel' ? 'bg-white text-dark shadow-sm' : 'text-muted'}`}
              onClick={() => handleSwitchScope('hotel')}
            >
              🏨 Hotel-Level Amenities
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-bold border-0 transition-all ${targetScope !== 'hotel' ? 'bg-white text-dark shadow-sm' : 'text-muted'}`}
              onClick={() => {
                if (hotelRooms.length > 0) handleSwitchScope(hotelRooms[0].id);
              }}
            >
              🛏️ Room-Level Amenities {hotelRooms.length > 0 && `(${hotelRooms.length} types)`}
            </button>
          </div>
        </div>

        {targetScope !== 'hotel' && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small fw-semibold">Select Room Type:</span>
            {hotelRooms.length === 0 ? (
              <span className="badge bg-light text-muted border">No room types found for this hotel</span>
            ) : (
              <select
                className="form-select form-select-sm rounded-pill fw-bold border-secondary border-opacity-25"
                style={{ minWidth: '220px', fontSize: '0.82rem' }}
                value={targetScope}
                onChange={(e) => handleSwitchScope(e.target.value)}
              >
                {hotelRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.total_rooms || 1} rooms)</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Requests Status Bar (if any pending/recent) */}
      {requests.length > 0 && (
        <div className="bg-white rounded-4 border p-3 mb-4 shadow-sm">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-1.5" style={{ fontSize: '0.85rem' }}>
              <Clock size={15} className="text-warning" /> Your Custom Amenity Requests ({requests.length})
            </h6>
            <span className="text-muted small">Submitted to Admin for platform-wide reuse</span>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {requests.map(req => {
              const isApproved = (req.status || '').toLowerCase() === 'approved';
              const isRejected = (req.status || '').toLowerCase() === 'rejected';
              return (
                <div
                  key={req.id}
                  className="p-2 px-3 rounded-pill border d-flex align-items-center gap-2"
                  style={{
                    background: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fefce8',
                    borderColor: isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fef08a'
                  }}
                >
                  <span className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                    {req.custom_name || req.suggested_name}
                  </span>
                  <span
                    className="badge rounded-pill text-uppercase"
                    style={{
                      fontSize: '0.62rem',
                      background: isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#ca8a04',
                      color: '#fff'
                    }}
                  >
                    {req.status || 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="bg-white rounded-4 border p-3 mb-4 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
          <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input
            type="text"
            className="form-control form-control-sm ps-5 rounded-pill"
            placeholder="Search amenities (e.g. Wi-Fi, Pool, Bar, Balcony)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        <div className="d-flex gap-1.5 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-nowrap border ${
              selectedCategoryTab === 'all'
                ? 'btn-dark text-white border-dark'
                : 'btn-light text-muted border-secondary border-opacity-20'
            }`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setSelectedCategoryTab('all')}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-nowrap border ${
                selectedCategoryTab === c.id
                  ? 'btn-dark text-white border-dark'
                  : 'btn-light text-muted border-secondary border-opacity-20'
              }`}
              style={{ fontSize: '0.78rem' }}
              onClick={() => setSelectedCategoryTab(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Amenities Grid */}
      {loading ? (
        <div className="p-5 text-center bg-white rounded-4 border">
          <RefreshCw size={32} className="spin text-primary mb-2" />
          <div className="text-muted small">Loading categorized amenities...</div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="bg-white rounded-4 border shadow-sm p-4">
              <div className="d-flex align-items-center justify-content-between border-bottom pb-2.5 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <h6 className="fw-bold text-dark mb-0">{cat.name}</h6>
                  <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                    {cat.scope || 'hotel'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-link text-primary p-0 text-decoration-none fw-semibold d-flex align-items-center gap-1"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setCustomItemModal({ open: true, categoryId: cat.id })}
                >
                  <Plus size={13} /> Add Custom Item
                </button>
              </div>

              {/* Amenity Badges / Checkboxes */}
              <div className="d-flex flex-wrap gap-2">
                {cat.itemsToDisplay.map(item => {
                  const isChecked = selectedAmenities.includes(item.name);
                  return (
                    <button
                      key={item.id || item.name}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 border transition-all ${
                        isChecked
                          ? 'btn-dark text-white border-dark shadow-sm'
                          : 'btn-light text-muted bg-white border-secondary border-opacity-25'
                      }`}
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => handleToggleAmenity(item.name)}
                    >
                      {isChecked ? <Check size={13} className="text-warning" /> : <Plus size={13} className="opacity-40" />}
                      <span>{item.name}</span>
                      {item.is_custom && (
                        <span className="badge bg-secondary bg-opacity-20 text-dark ms-1" style={{ fontSize: '0.6rem' }}>
                          Custom
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Add Hotel-Specific Custom Item (Immediate)
      ───────────────────────────────────────────────────────────── */}
      {customItemModal.open && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setCustomItemModal({ open: false, categoryId: '' })}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '440px', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: '#0D1B2E' }}>
              <h6 className="fw-bold mb-0">Add Custom Hotel Amenity</h6>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setCustomItemModal({ open: false, categoryId: '' })}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="p-4 d-flex flex-column gap-3">
              <p className="text-muted small mb-0">
                This custom item is saved immediately for this hotel without requiring administrative approval.
              </p>

              <div>
                <label className="form-label fw-bold text-muted small">Amenity Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Private Beach Access Pathway, Sunset Lawn..."
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setCustomItemModal({ open: false, categoryId: '' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white px-4 rounded-pill fw-bold"
                  style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
                >
                  Add to Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Request New Global Amenity (Admin Review Workflow)
      ───────────────────────────────────────────────────────────── */}
      {requestModal && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setRequestModal(false)}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '500px', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: '#0D1B2E' }}>
              <div className="d-flex align-items-center gap-2">
                <Sparkles size={16} className="text-warning" />
                <h6 className="fw-bold mb-0">Request New Platform Amenity</h6>
              </div>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setRequestModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitGlobalRequest} className="p-4 d-flex flex-column gap-3">
              <p className="text-muted small mb-0">
                Submit an amenity request to the WOW THAILAND Super Admin team for verification and platform-wide catalog inclusion.
              </p>

              <div>
                <label className="form-label fw-bold text-muted small">Amenity Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rooftop Infinity Jacuzzi, EV Fast Charger..."
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  required
                />
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Suggested Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={requestCategory}
                    onChange={e => setRequestCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Scope</label>
                  <select
                    className="form-select form-select-sm"
                    value={requestScope}
                    onChange={e => setRequestScope(e.target.value)}
                  >
                    <option value="hotel">Hotel-Level</option>
                    <option value="room">Room-Level</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Description / Notes for Admin</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Why this amenity is useful and where it is located..."
                  value={requestDescription}
                  onChange={e => setRequestDescription(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setRequestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white px-4 rounded-pill fw-bold"
                  style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
