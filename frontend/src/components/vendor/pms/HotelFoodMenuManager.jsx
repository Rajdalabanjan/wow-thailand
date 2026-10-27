import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils, Plus, Edit2, Trash2, Search, Filter, RefreshCw, Upload,
  X, Check, AlertCircle, Eye, EyeOff, Sparkles, Coffee, Sun, Moon,
  Cookie, Wine, CheckCircle2, DollarSign, Image as ImageIcon
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../../services/api';

const MENU_CATEGORIES = [
  'All Dishes',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks & Starters',
  'Beverages & Shakes',
  'Desserts'
];

export default function HotelFoodMenuManager({ currentUser, vendorHotels = [], selectedHotelId: initialHotelId }) {
  const [selectedHotelId, setSelectedHotelId] = useState(() => {
    return initialHotelId || vendorHotels[0]?.id || '';
  });

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Dishes');
  const [vegFilter, setVegFilter] = useState('all'); // 'all' | 'veg' | 'non_veg' | 'jain'
  const [searchTerm, setSearchTerm] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Breakfast');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(1);
  const [formIsJain, setFormIsJain] = useState(0);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(1);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);

  useEffect(() => {
    if (!selectedHotelId && vendorHotels.length > 0) {
      setSelectedHotelId(vendorHotels[0].id);
    }
  }, [vendorHotels]);

  const showAlert = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const loadMenuItems = async () => {
    if (!selectedHotelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {};
      const res = await apiFetch(`${API_BASE}?resource=hotel_menu_items&hotel_id=${encodeURIComponent(selectedHotelId)}`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.menu_items)) {
        setMenuItems(data.menu_items);
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
      showAlert('Failed to load menu items.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, [selectedHotelId]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory(selectedCategory === 'All Dishes' ? 'Breakfast' : selectedCategory);
    setFormPrice('');
    setFormDescription('');
    setFormIsVeg(1);
    setFormIsJain(0);
    setFormImageUrl('');
    setFormIsAvailable(1);
    setFormDisplayOrder(menuItems.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormCategory(item.category_name || item.category || 'Breakfast');
    setFormPrice(item.price ?? '');
    setFormDescription(item.description || '');
    setFormIsVeg(item.is_veg ? 1 : 0);
    setFormIsJain(item.is_jain ? 1 : 0);
    setFormImageUrl(item.image_url || '');
    setFormIsAvailable(item.is_available !== 0 ? 1 : 0);
    setFormDisplayOrder(item.display_order ?? 0);
    setModalOpen(true);
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
      formData.append('category', 'food_menu');
      formData.append('media', file);

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormImageUrl(data.url);
        showAlert('Dish photo uploaded successfully.');
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !selectedHotelId) {
      alert('Please provide dish name.');
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const payload = {
        action: 'pms_save_menu_item',
        auth_token: token,
        hotel_id: selectedHotelId,
        id: editingItem?.id || undefined,
        name: formName.trim(),
        category_name: formCategory,
        price: parseFloat(formPrice || 0),
        description: formDescription.trim(),
        is_veg: formIsVeg ? 1 : 0,
        is_jain: formIsJain ? 1 : 0,
        image_url: formImageUrl,
        is_available: formIsAvailable ? 1 : 0,
        display_order: parseInt(formDisplayOrder || 0, 10)
      };

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Dish saved successfully.');
        setModalOpen(false);
        loadMenuItems();
      } else {
        alert(data.error || 'Failed to save dish');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDish = async (dishId) => {
    if (!confirm('Are you sure you want to remove this dish from the menu?')) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_delete_menu_item',
          auth_token: token,
          hotel_id: selectedHotelId,
          id: dishId
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Dish removed from menu.');
        loadMenuItems();
      } else {
        alert(data.error || 'Failed to delete dish');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_save_menu_item',
          auth_token: token,
          hotel_id: selectedHotelId,
          id: item.id,
          name: item.name,
          category_name: item.category_name || item.category,
          price: item.price,
          is_veg: item.is_veg,
          is_jain: item.is_jain,
          description: item.description,
          image_url: item.image_url,
          display_order: item.display_order,
          is_available: item.is_available === 0 ? 1 : 0
        })
      });
      loadMenuItems();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered menu calculation
  const filteredDishes = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCat = selectedCategory === 'All Dishes' ||
        (item.category_name && item.category_name.toLowerCase() === selectedCategory.toLowerCase()) ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesVeg = vegFilter === 'all' ||
        (vegFilter === 'veg' && item.is_veg === 1) ||
        (vegFilter === 'non_veg' && item.is_veg === 0) ||
        (vegFilter === 'jain' && item.is_jain === 1);

      const matchesSearch = !searchTerm ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesCat && matchesVeg && matchesSearch;
    });
  }, [menuItems, selectedCategory, vegFilter, searchTerm]);

  return (
    <div className="p-3 p-lg-4" style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* Toast */}
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
            <Utensils size={22} />
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: '#0D1B2E' }}>Food & Drink Menu</h4>
            <p className="text-muted small mb-0">Manage restaurant dishes, pricing, meal categories, and diet preferences</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Hotel selector */}
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
            onClick={loadMenuItems}
            disabled={loading || actionLoading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-sm text-white d-flex align-items-center gap-1 rounded-pill px-3 fw-bold"
            style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
            onClick={openAddModal}
          >
            <Plus size={14} /> Add New Dish
          </button>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="d-flex gap-2 overflow-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
        {MENU_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-semibold text-nowrap border ${
              selectedCategory === cat
                ? 'btn-dark text-white border-dark shadow-sm'
                : 'btn-white text-muted bg-white border-secondary border-opacity-20'
            }`}
            style={{ fontSize: '0.8rem' }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3 p-3 shadow-sm border mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
          <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <input
            type="text"
            className="form-control form-control-sm ps-5 rounded-pill"
            placeholder="Search dish by name, ingredients, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {/* Veg / Diet filter buttons */}
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className={`btn ${vegFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setVegFilter('all')}
          >
            All Diets
          </button>
          <button
            type="button"
            className={`btn ${vegFilter === 'veg' ? 'btn-success text-white' : 'btn-outline-success'}`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setVegFilter('veg')}
          >
            🟢 Pure Veg
          </button>
          <button
            type="button"
            className={`btn ${vegFilter === 'non_veg' ? 'btn-danger text-white' : 'btn-outline-danger'}`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setVegFilter('non_veg')}
          >
            🔴 Non-Veg
          </button>
          <button
            type="button"
            className={`btn ${vegFilter === 'jain' ? 'btn-warning text-dark' : 'btn-outline-warning'}`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setVegFilter('jain')}
          >
            🟡 Jain Friendly
          </button>
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="p-5 text-center bg-white rounded-4 border">
          <RefreshCw size={32} className="spin text-primary mb-2" />
          <div className="text-muted small">Loading menu items...</div>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="p-5 text-center bg-white rounded-4 border shadow-sm">
          <Utensils size={40} className="text-muted mb-2 opacity-40" />
          <h6 className="fw-bold text-dark">No dishes found in this category</h6>
          <p className="text-muted small mb-3">Add breakfast dishes, local Thai specialties, or drinks to showcase on your hotel profile.</p>
          <button
            type="button"
            className="btn btn-sm text-white rounded-pill px-4 fw-bold"
            style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
            onClick={openAddModal}
          >
            <Plus size={14} className="me-1" /> Add First Dish
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {filteredDishes.map((dish) => (
            <div key={dish.id} className="col-md-6 col-lg-4 col-xl-3">
              <div
                className="card h-100 border rounded-4 shadow-sm overflow-hidden d-flex flex-column"
                style={{
                  background: '#fff',
                  opacity: dish.is_available === 0 ? 0.65 : 1,
                  transition: 'transform 0.15s ease'
                }}
              >
                {/* Image header */}
                <div className="position-relative" style={{ height: '140px', background: '#f1f5f9' }}>
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                      <ImageIcon size={28} className="opacity-40 mb-1" />
                      <span style={{ fontSize: '0.7rem' }}>No Photo</span>
                    </div>
                  )}

                  {/* Badges on image */}
                  <div className="position-absolute top-0 start-0 m-2 d-flex flex-wrap gap-1">
                    <span
                      className="badge rounded-pill fw-bold"
                      style={{
                        background: dish.is_veg ? '#16a34a' : '#dc2626',
                        color: '#fff',
                        fontSize: '0.65rem'
                      }}
                    >
                      {dish.is_veg ? 'Pure Veg' : 'Non-Veg'}
                    </span>
                    {dish.is_jain === 1 && (
                      <span className="badge bg-warning text-dark rounded-pill fw-bold" style={{ fontSize: '0.65rem' }}>
                        Jain
                      </span>
                    )}
                  </div>

                  <div className="position-absolute bottom-0 end-0 m-2">
                    <span className="badge bg-dark bg-opacity-75 text-white rounded-pill" style={{ fontSize: '0.68rem' }}>
                      {dish.category_name || dish.category || 'Special'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
                  <div>
                    <div className="d-flex align-items-start justify-content-between gap-1 mb-1">
                      <h6 className="fw-bold text-dark mb-0 text-truncate" title={dish.name} style={{ fontSize: '0.92rem' }}>
                        {dish.name}
                      </h6>
                      <span className="fw-bold text-primary flex-shrink-0" style={{ fontSize: '0.95rem' }}>
                        ฿{parseFloat(dish.price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {dish.description && (
                      <p className="text-muted mb-2 text-truncate-2" style={{ fontSize: '0.75rem', minHeight: '32px' }} title={dish.description}>
                        {dish.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Availability */}
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-2">
                    <button
                      type="button"
                      className={`btn btn-sm p-0 border-0 d-flex align-items-center gap-1 ${dish.is_available === 0 ? 'text-danger' : 'text-success'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleToggleAvailability(dish)}
                      title="Click to toggle availability in hotel dining"
                    >
                      {dish.is_available === 0 ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{dish.is_available === 0 ? 'Unavailable' : 'Available'}</span>
                    </button>

                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary p-1 rounded-circle"
                        title="Edit Dish"
                        onClick={() => openEditModal(dish)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger p-1 rounded-circle"
                        title="Remove Dish"
                        onClick={() => handleDeleteDish(dish.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Add / Edit Dish Form
      ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: '#0D1B2E' }}>
              <div className="d-flex align-items-center gap-2">
                <Utensils size={18} className="text-warning" />
                <h6 className="fw-bold mb-0">{editingItem ? 'Edit Dish' : 'Add New Dish to Menu'}</h6>
              </div>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="p-4 d-flex flex-column gap-3">
              <div>
                <label className="form-label fw-bold text-muted small">Dish Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Thai Fish Curry Thali, Paneer Tikka..."
                  required
                />
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Menu Category *</label>
                  <select
                    className="form-select"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    required
                  >
                    {MENU_CATEGORIES.filter(c => c !== 'All Dishes').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Price (฿) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    min="0"
                    placeholder="350"
                    required
                  />
                </div>
              </div>

              {/* Diet Options */}
              <div className="p-3 rounded-3 border bg-light">
                <label className="form-label fw-bold text-dark small mb-2">Dietary Classification</label>
                <div className="d-flex flex-wrap gap-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="dietRadio"
                      id="pureVegRadio"
                      checked={formIsVeg === 1}
                      onChange={() => setFormIsVeg(1)}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="pureVegRadio">
                      🟢 Pure Vegetarian
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="dietRadio"
                      id="nonVegRadio"
                      checked={formIsVeg === 0}
                      onChange={() => setFormIsVeg(0)}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="nonVegRadio">
                      🔴 Non-Vegetarian
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="jainCheckbox"
                      checked={formIsJain === 1}
                      onChange={e => setFormIsJain(e.target.checked ? 1 : 0)}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="jainCheckbox">
                      🟡 Jain Friendly
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Dish Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Ingredients, preparation style, spice level..."
                />
              </div>

              {/* Photo Upload & URL */}
              <div>
                <label className="form-label fw-bold text-muted small">Dish Photo</label>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <input
                    type="file"
                    id="dishPhotoFile"
                    className="d-none"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1 rounded-pill px-3"
                    onClick={() => document.getElementById('dishPhotoFile')?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload size={14} /> {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                  <span className="text-muted small">JPG, PNG, WEBP max 10MB</span>
                </div>

                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  placeholder="Or paste direct image URL (e.g. https://images.unsplash.com/...)"
                />

                {formImageUrl && (
                  <div className="mt-2 position-relative d-inline-block rounded-3 overflow-hidden border" style={{ width: '120px', height: '80px' }}>
                    <img src={formImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center"
                      style={{ width: '18px', height: '18px' }}
                      onClick={() => setFormImageUrl('')}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status and Order */}
              <div className="row g-2 align-items-center">
                <div className="col-md-6">
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="availSwitch"
                      checked={formIsAvailable === 1}
                      onChange={e => setFormIsAvailable(e.target.checked ? 1 : 0)}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="availSwitch">
                      Available Today
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Menu Display Order</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={formDisplayOrder}
                    onChange={e => setFormDisplayOrder(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white px-4 rounded-pill fw-bold"
                  style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
                  disabled={actionLoading || uploadingImage}
                >
                  {actionLoading ? 'Saving...' : editingItem ? 'Update Dish' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
