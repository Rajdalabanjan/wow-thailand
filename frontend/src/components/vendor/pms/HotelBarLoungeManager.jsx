import React, { useState, useEffect } from 'react';
import {
  Wine, Clock, Shield, Upload, X, Check, Trash2, Camera,
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, Plus, Image as ImageIcon
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../../services/api';

const DEFAULT_FEATURE_OPTIONS = [
  'Sea View', 'Sunset Deck', 'Live DJ', 'Signature Cocktails',
  'Craft Beer', 'Finger Food', 'Outdoor Seating', 'AC Indoor Lounge',
  'Live Music', 'Poolside', 'Finger Food & Tapas', 'Happy Hours'
];

export default function HotelBarLoungeManager({ currentUser, vendorHotels = [], selectedHotelId: initialHotelId }) {
  const [selectedHotelId, setSelectedHotelId] = useState(() => {
    return initialHotelId || vendorHotels[0]?.id || '';
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Bar profile form fields
  const [barId, setBarId] = useState(null);
  const [name, setName] = useState('Sunset Breeze Rooftop Lounge & Bar');
  const [timingOpen, setTimingOpen] = useState('04:00 PM');
  const [timingClose, setTimingClose] = useState('01:00 AM');
  const [entryPolicy, setEntryPolicy] = useState('Free Entry for Hotel Guests & Couples');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState(['Sea View', 'Signature Cocktails']);
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [images, setImages] = useState([]);
  const [coverImage, setCoverImage] = useState('');
  const [isActive, setIsActive] = useState(1);

  useEffect(() => {
    if (!selectedHotelId && vendorHotels.length > 0) {
      setSelectedHotelId(vendorHotels[0].id);
    }
  }, [vendorHotels]);

  const showAlert = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const loadBarDetails = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {};
      const res = await apiFetch(`${API_BASE}?resource=pms_get_bar_lounge&hotel_id=${encodeURIComponent(selectedHotelId)}`, { headers });
      const data = await res.json();
      if (data.success && data.bar) {
        const b = data.bar;
        setBarId(b.id || null);
        setName(b.name || '');
        setTimingOpen(b.timing_open || '04:00 PM');
        setTimingClose(b.timing_close || '01:00 AM');
        setEntryPolicy(b.entry_policy || 'Free Entry for Hotel Guests & Couples');
        setDescription(b.description || '');
        setFeatures(Array.isArray(b.features) ? b.features : []);
        setImages(Array.isArray(b.images) ? b.images : []);
        setCoverImage(b.cover_image || (Array.isArray(b.images) && b.images[0]) || '');
        setIsActive(b.is_active !== undefined ? (parseInt(b.is_active, 10) === 0 ? 0 : 1) : 1);
      } else {
        // Reset to default empty form
        setBarId(null);
        setName('');
        setTimingOpen('04:00 PM');
        setTimingClose('01:00 AM');
        setEntryPolicy('Free Entry for Hotel Guests & Couples');
        setDescription('');
        setFeatures([]);
        setImages([]);
        setCoverImage('');
        setIsActive(1);
      }
    } catch (err) {
      console.error('Failed to load bar profile:', err);
      showAlert('Failed to load bar profile.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarDetails();
  }, [selectedHotelId]);

  const handleToggleFeature = (feat) => {
    if (features.includes(feat)) {
      setFeatures(features.filter(f => f !== feat));
    } else {
      setFeatures([...features, feat]);
    }
  };

  const handleAddCustomFeature = () => {
    const trimmed = customFeatureInput.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
      setCustomFeatureInput('');
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('action', 'pms_upload_dining_media');
      formData.append('auth_token', token);
      formData.append('hotel_id', selectedHotelId);
      formData.append('category', 'bar_lounge');
      formData.append('media', file);

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        const newImages = [...images, data.url];
        setImages(newImages);
        if (!coverImage) setCoverImage(data.url);
        showAlert('Bar photo uploaded successfully.');
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (imgUrl) => {
    const updated = images.filter(url => url !== imgUrl);
    setImages(updated);
    if (coverImage === imgUrl) {
      setCoverImage(updated[0] || '');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name for your bar & lounge.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const payload = {
        action: 'pms_save_bar_lounge',
        auth_token: token,
        hotel_id: selectedHotelId,
        name: name.trim(),
        timing_open: timingOpen.trim(),
        timing_close: timingClose.trim(),
        entry_policy: entryPolicy.trim(),
        description: description.trim(),
        features,
        images,
        cover_image: coverImage || (images[0] || ''),
        is_active: isActive ? 1 : 0
      };

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Bar & Lounge profile saved successfully.');
        loadBarDetails();
      } else {
        alert(data.error || 'Failed to save bar profile');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to deactivate or remove this Bar & Lounge profile?')) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_delete_bar_lounge',
          auth_token: token,
          hotel_id: selectedHotelId
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Bar & Lounge profile deactivated.');
        loadBarDetails();
      } else {
        alert(data.error || 'Failed to deactivate bar');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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
            <Wine size={22} />
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#0D1B2E' }}>Hotel Bar & Lounge Profile</h4>
            <p className="text-muted small mb-0">Feature signature cocktails, sunset views, opening hours, and guest entry policies</p>
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
            onClick={loadBarDetails}
            disabled={loading || saving}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-center bg-white rounded-4 border">
          <RefreshCw size={32} className="spin text-primary mb-2" />
          <div className="text-muted small">Loading bar & lounge details...</div>
        </div>
      ) : (
        <form onSubmit={handleSaveProfile} className="row g-4">
          {/* Main Info Card */}
          <div className="col-lg-8">
            <div className="bg-white rounded-4 border shadow-sm p-4 d-flex flex-column gap-3 mb-4">
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-2">General Details</h6>

              <div>
                <label className="form-label fw-bold text-muted small">Bar / Lounge Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sunset Breeze Rooftop Lounge & Bar"
                  required
                />
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Opening Time</label>
                  <input
                    type="text"
                    className="form-control"
                    value={timingOpen}
                    onChange={e => setTimingOpen(e.target.value)}
                    placeholder="e.g. 04:00 PM"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Closing Time</label>
                  <input
                    type="text"
                    className="form-control"
                    value={timingClose}
                    onChange={e => setTimingClose(e.target.value)}
                    placeholder="e.g. 01:00 AM"
                  />
                </div>
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Guest Entry Policy</label>
                <input
                  type="text"
                  className="form-control"
                  value={entryPolicy}
                  onChange={e => setEntryPolicy(e.target.value)}
                  placeholder="e.g. Free entry for hotel guests & couples; reservation recommended on weekends"
                />
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Description & Atmosphere</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Highlight sunset views, resident DJ, signature Thai cocktails, appetizer specialties..."
                />
              </div>

              {/* Features and Chips */}
              <div>
                <label className="form-label fw-bold text-muted small mb-1">Features & Highlights</label>
                <div className="d-flex flex-wrap gap-1.5 mb-2">
                  {DEFAULT_FEATURE_OPTIONS.map(opt => {
                    const selected = features.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold border ${
                          selected
                            ? 'btn-primary text-white border-primary shadow-sm'
                            : 'btn-light text-muted border-secondary border-opacity-25'
                        }`}
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => handleToggleFeature(opt)}
                      >
                        {selected && <Check size={12} className="me-1" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom feature input */}
                <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add custom feature..."
                    value={customFeatureInput}
                    onChange={e => setCustomFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomFeature(); } }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleAddCustomFeature}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Photos & Media Card */}
            <div className="bg-white rounded-4 border shadow-sm p-4 d-flex flex-column gap-3">
              <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                <h6 className="fw-bold text-dark mb-0">Bar & Lounge Photos</h6>
                <span className="text-muted small">Display in customer hotel details dining section</span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <input
                  type="file"
                  id="barPhotoFileInput"
                  className="d-none"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark rounded-pill px-3 d-flex align-items-center gap-1.5"
                  onClick={() => document.getElementById('barPhotoFileInput')?.click()}
                  disabled={uploadingImage}
                >
                  <Upload size={14} /> {uploadingImage ? 'Uploading...' : 'Upload Photos'}
                </button>
                <span className="text-muted small">Select JPG, PNG or WEBP (Max 10MB)</span>
              </div>

              {/* Photo gallery preview */}
              {images.length === 0 ? (
                <div className="p-4 text-center border rounded-3 bg-light text-muted small">
                  No photos uploaded yet. Upload images of your bar counter, lounge seating, or cocktails.
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2.5 pt-2">
                  {images.map((url, idx) => {
                    const isCover = coverImage === url || (!coverImage && idx === 0);
                    return (
                      <div
                        key={url}
                        className="position-relative rounded-3 overflow-hidden border shadow-sm"
                        style={{ width: '130px', height: '90px' }}
                      >
                        <img src={url} alt={`Bar ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isCover ? (
                          <span className="position-absolute top-0 start-0 badge bg-dark text-white m-1" style={{ fontSize: '0.62rem' }}>
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="position-absolute bottom-0 start-0 w-100 btn btn-dark btn-sm p-0 text-white border-0 opacity-75"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => setCoverImage(url)}
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          className="position-absolute top-0 end-0 btn btn-danger btn-sm p-0 d-flex align-items-center justify-content-center"
                          style={{ width: '20px', height: '20px', borderRadius: '0 0 0 6px' }}
                          onClick={() => handleRemoveImage(url)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Status / Control Column */}
          <div className="col-lg-4">
            <div className="bg-white rounded-4 border shadow-sm p-4 d-flex flex-column gap-3 mb-4">
              <h6 className="fw-bold text-dark border-bottom pb-2 mb-2">Publishing Status</h6>

              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="barActiveSwitch"
                  checked={isActive === 1}
                  onChange={e => setIsActive(e.target.checked ? 1 : 0)}
                />
                <label className="form-check-label fw-bold text-dark small" htmlFor="barActiveSwitch">
                  Bar & Lounge is Open & Active
                </label>
              </div>
              <p className="text-muted small mb-0">
                When active, your bar profile, opening hours, and photos are displayed to guests viewing your hotel details.
              </p>

              <div className="d-flex flex-column gap-2 pt-3 border-top">
                <button
                  type="submit"
                  className="btn text-white w-100 rounded-pill py-2 fw-bold"
                  style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
                  disabled={saving || uploadingImage}
                >
                  {saving ? 'Saving Profile...' : 'Save Bar & Lounge Profile'}
                </button>

                {barId && (
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 rounded-pill py-1.5 fw-semibold"
                    style={{ fontSize: '0.85rem' }}
                    onClick={handleDeleteProfile}
                    disabled={saving}
                  >
                    Deactivate Profile
                  </button>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 rounded-4 border bg-white shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                <Sparkles size={16} />
                <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.88rem' }}>MakeMyTrip Standard Tips</h6>
              </div>
              <ul className="text-muted small ps-3 mb-0" style={{ fontSize: '0.78rem', lineHeight: '1.6' }}>
                <li>List exact happy hours and couple entry rules.</li>
                <li>Add photos taken during golden hour or twilight for best booking appeal.</li>
                <li>Select "Sea View" and "Live DJ" tags if available to appear in filtered searches.</li>
              </ul>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
