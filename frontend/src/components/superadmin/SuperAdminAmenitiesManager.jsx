import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Layers, Plus, Edit2, Trash2, Check, X, Search, Filter,
  Eye, CheckCircle2, XCircle, Clock, AlertCircle, ArrowUpDown, ChevronDown,
  ChevronRight, ArrowUp, ArrowDown, Star, Globe, Hotel, Bed, Shield,
  RefreshCw, Building, Utensils, Heart, Waves, Baby, Compass, Tv, ShieldCheck,
  Tag, Info, HelpCircle
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../services/api';

const COLORS = {
  primary: '#FF6333',
  dark: '#0D1B2E',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  info: '#0284c7'
};

// Lucide icon helper with dynamic fallback
const ICON_COMPONENTS = {
  Sparkles, Layers, Hotel, Bed, Heart, Building, Utensils, Waves, Baby,
  Compass, Tv, ShieldCheck, Tag, Star, Globe, Shield
};

function renderIcon(iconName, size = 16, className = '') {
  const IconComponent = ICON_COMPONENTS[iconName] || Sparkles;
  return <IconComponent size={size} className={className} />;
}

export default function SuperAdminAmenitiesManager({ currentUser }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'requests'
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'hotel' | 'room'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modal States
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [amenityModal, setAmenityModal] = useState({ open: false, amenity: null, defaultCategoryId: '' });
  const [reviewModal, setReviewModal] = useState({ open: false, request: null, decision: 'approve' });
  const [alertMsg, setAlertMsg] = useState(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {};

      // 1. Fetch categories and master amenities
      const catRes = await apiFetch(`${API_BASE}?resource=hotel_amenity_categories`, { headers });
      const catData = await catRes.json();
      if (catData.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }

      // 2. Fetch custom amenity requests
      const reqRes = await apiFetch(`${API_BASE}?resource=pms_list_amenity_requests`, { headers });
      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.requests)) {
        setRequests(reqData.requests);
      }
    } catch (err) {
      console.error('Failed to load amenity management data:', err);
      showAlert('Failed to connect to amenities server.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // Category CRUD Handlers
  // -------------------------------------------------------------
  const handleSaveCategory = async (catData) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_save_category',
          auth_token: token,
          ...catData
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Category saved successfully.');
        setCategoryModal({ open: false, category: null });
        loadData();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id, force = false) => {
    if (!confirm('Are you sure you want to remove or deactivate this category?')) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_delete_category',
          auth_token: token,
          id,
          force
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Category processed.');
        loadData();
      } else {
        alert(data.error || 'Failed to remove category');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Master Amenity CRUD Handlers
  // -------------------------------------------------------------
  const handleSaveAmenity = async (amData) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_save_master_amenity',
          auth_token: token,
          ...amData
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Master amenity saved successfully.');
        setAmenityModal({ open: false, amenity: null, defaultCategoryId: '' });
        loadData();
      } else {
        alert(data.error || 'Failed to save amenity');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleHighlight = async (amenity) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_save_master_amenity',
          auth_token: token,
          id: amenity.id,
          category_id: amenity.category_id,
          name: amenity.name,
          icon: amenity.icon || amenity.icon_name,
          scope: amenity.scope || 'hotel',
          display_order: amenity.display_order,
          is_active: amenity.is_active,
          is_highlight: amenity.is_highlight ? 0 : 1
        })
      });
      loadData();
    } catch (err) {
      alert('Error toggling highlight: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAmenityActive = async (amenity) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_save_master_amenity',
          auth_token: token,
          id: amenity.id,
          category_id: amenity.category_id,
          name: amenity.name,
          icon: amenity.icon || amenity.icon_name,
          scope: amenity.scope || 'hotel',
          display_order: amenity.display_order,
          is_highlight: amenity.is_highlight,
          is_active: amenity.is_active ? 0 : 1
        })
      });
      loadData();
    } catch (err) {
      alert('Error toggling status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAmenity = async (id, permanent = false) => {
    if (!confirm('Are you sure you want to deactivate or remove this master amenity?')) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_delete_master_amenity',
          auth_token: token,
          id,
          permanent
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Amenity deactivated.');
        loadData();
      } else {
        alert(data.error || 'Failed to remove amenity');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Review Custom Amenity Request Handler
  // -------------------------------------------------------------
  const handleReviewRequest = async (reviewData) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify({
          action: 'pms_admin_review_amenity_request',
          auth_token: token,
          ...reviewData
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Amenity request processed successfully.');
        setReviewModal({ open: false, request: null, decision: 'approve' });
        loadData();
      } else {
        alert(data.error || 'Failed to review request');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered Data Calculations
  // -------------------------------------------------------------
  const filteredCategories = useMemo(() => {
    return categories.map(cat => {
      // Filter amenities within category
      const amenities = (cat.amenities || []).filter(am => {
        const matchesSearch = !searchTerm ||
          am.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (am.default_sublabel && am.default_sublabel.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesScope = scopeFilter === 'all' || am.scope === scopeFilter || am.scope === 'both';
        return matchesSearch && matchesScope;
      });

      const catMatchesSearch = !searchTerm || cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const catMatchesScope = scopeFilter === 'all' || cat.scope === scopeFilter || cat.scope === 'both';
      const catMatchesFilter = selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter;

      return {
        ...cat,
        filteredAmenities: amenities,
        shouldShow: (catMatchesFilter && (catMatchesSearch || amenities.length > 0)) && catMatchesScope
      };
    }).filter(c => c.shouldShow);
  }, [categories, searchTerm, scopeFilter, selectedCategoryFilter]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStatus = statusFilter === 'all' || (req.status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = !searchTerm ||
        (req.custom_name && req.custom_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.hotel_name && req.hotel_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.vendor_name && req.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesScope = scopeFilter === 'all' || req.scope === scopeFilter || req.scope === 'both';
      return matchesStatus && matchesSearch && matchesScope;
    });
  }, [requests, statusFilter, searchTerm, scopeFilter]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  }, [requests]);

  const totalMasterAmenitiesCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.amenities?.length || 0), 0);
  }, [categories]);

  if (!isAdmin) {
    return (
      <div className="p-5 text-center">
        <AlertCircle size={48} className="text-danger mb-3" />
        <h4 className="fw-bold">Access Denied</h4>
        <p className="text-muted">You must have administrator privileges to manage hotel amenities.</p>
      </div>
    );
  }

  return (
    <div className="p-3 p-lg-4" style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* Alert toast */}
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
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ background: '#FF633315', color: '#FF6333' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: COLORS.dark }}>Hotel Amenities & Dining Manager</h4>
              <p className="text-muted small mb-0">Master categorization, amenity highlights, and vendor request workflows</p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-3"
            onClick={loadData}
            disabled={loading || actionLoading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {activeTab === 'categories' && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1 rounded-pill px-3 fw-bold"
                onClick={() => setCategoryModal({ open: true, category: null })}
              >
                <Plus size={14} /> Add Category
              </button>
              <button
                type="button"
                className="btn btn-sm text-white d-flex align-items-center gap-1 rounded-pill px-3 fw-bold"
                style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
                onClick={() => setAmenityModal({ open: true, amenity: null, defaultCategoryId: categories[0]?.id || '' })}
              >
                <Plus size={14} /> Add Master Amenity
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="d-flex align-items-center justify-content-between border-bottom mb-4">
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn pb-3 px-3 fw-bold border-0 position-relative ${activeTab === 'categories' ? 'text-primary' : 'text-muted'}`}
            style={{ borderRadius: 0, fontSize: '0.95rem' }}
            onClick={() => setActiveTab('categories')}
          >
            <span className="d-flex align-items-center gap-2">
              <Layers size={16} /> Categories & Master Amenities
              <span className="badge bg-secondary rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                {totalMasterAmenitiesCount}
              </span>
            </span>
            {activeTab === 'categories' && (
              <span className="position-absolute bottom-0 start-0 w-100 bg-primary" style={{ height: '3px' }} />
            )}
          </button>

          <button
            type="button"
            className={`btn pb-3 px-3 fw-bold border-0 position-relative ${activeTab === 'requests' ? 'text-primary' : 'text-muted'}`}
            style={{ borderRadius: 0, fontSize: '0.95rem' }}
            onClick={() => setActiveTab('requests')}
          >
            <span className="d-flex align-items-center gap-2">
              <Clock size={16} /> Custom Amenity Requests
              {pendingRequestsCount > 0 && (
                <span className="badge bg-danger rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                  {pendingRequestsCount} Pending
                </span>
              )}
            </span>
            {activeTab === 'requests' && (
              <span className="position-absolute bottom-0 start-0 w-100 bg-primary" style={{ height: '3px' }} />
            )}
          </button>
        </div>
      </div>

      {/* Global Filter & Search Bar */}
      <div className="bg-white rounded-3 p-3 shadow-sm border mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-grow-1 align-items-center gap-2" style={{ minWidth: '240px' }}>
          <div className="position-relative flex-grow-1">
            <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
            <input
              type="text"
              className="form-control form-control-sm ps-5 rounded-pill"
              placeholder={activeTab === 'categories' ? 'Search categories or amenities...' : 'Search requested amenities, hotels, vendors...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          {searchTerm && (
            <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {activeTab === 'categories' && (
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: '180px', fontSize: '0.8rem' }}
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {activeTab === 'requests' && (
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: '150px', fontSize: '0.8rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}

          <div className="btn-group btn-group-sm">
            {['all', 'hotel', 'room'].map(scope => (
              <button
                key={scope}
                type="button"
                className={`btn ${scopeFilter === scope ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                onClick={() => setScopeFilter(scope)}
              >
                {scope === 'all' ? 'All Scopes' : `${scope}-Level`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: Categories & Master Amenities
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="d-flex flex-column gap-4">
          {loading ? (
            <div className="p-5 text-center bg-white rounded-3 border">
              <RefreshCw size={32} className="spin text-primary mb-2" />
              <div className="text-muted small">Loading categories and master amenities...</div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-5 text-center bg-white rounded-3 border">
              <Layers size={36} className="text-muted mb-2" />
              <div className="fw-bold">No categories or amenities found</div>
              <div className="text-muted small">Try adjusting your search or filters, or add a new category.</div>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-4 border shadow-sm overflow-hidden">
                {/* Category Header */}
                <div className="p-3 px-4 d-flex align-items-center justify-content-between border-bottom" style={{ background: '#f8fafc' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-3 p-2 bg-white border shadow-sm text-primary">
                      {renderIcon(category.icon || category.icon_name, 18)}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="fw-bold mb-0 text-dark">{category.name}</h6>
                        <span className="badge rounded-pill" style={{
                          background: category.scope === 'room' ? '#e0f2fe' : category.scope === 'both' ? '#f3e8ff' : '#fef3c7',
                          color: category.scope === 'room' ? '#0369a1' : category.scope === 'both' ? '#7e22ce' : '#b45309',
                          fontSize: '0.65rem'
                        }}>
                          {category.scope ? `${category.scope.toUpperCase()} SCOPE` : 'HOTEL'}
                        </span>
                        {!category.is_active && (
                          <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.65rem' }}>Inactive</span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Slug: <code>{category.slug || 'n/a'}</code> • Order: {category.display_order ?? 0} • {category.amenities?.length || 0} Amenities
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 rounded-pill px-3"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setAmenityModal({ open: true, amenity: null, defaultCategoryId: category.id })}
                    >
                      <Plus size={13} /> Add Amenity
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary p-1 rounded-circle"
                      title="Edit Category"
                      onClick={() => setCategoryModal({ open: true, category })}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger p-1 rounded-circle"
                      title="Deactivate Category"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Amenities List */}
                <div className="p-3 px-4">
                  {category.filteredAmenities.length === 0 ? (
                    <div className="py-3 text-center text-muted small">
                      No amenities in this category match the current filter.
                    </div>
                  ) : (
                    <div className="row g-2">
                      {category.filteredAmenities.map((amenity) => (
                        <div key={amenity.id} className="col-md-6 col-lg-4">
                          <div
                            className="p-2.5 px-3 rounded-3 border d-flex align-items-center justify-content-between h-100"
                            style={{
                              background: amenity.is_highlight ? '#fffbeb' : '#ffffff',
                              borderColor: amenity.is_highlight ? '#fde68a' : '#e2e8f0',
                              opacity: amenity.is_active === 0 ? 0.6 : 1
                            }}
                          >
                            <div className="d-flex align-items-center gap-2.5 overflow-hidden me-2">
                              <div className="text-muted flex-shrink-0">
                                {renderIcon(amenity.icon_name || amenity.icon, 15)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="fw-semibold text-truncate" style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                                  {amenity.name}
                                </div>
                                <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '0.7rem' }}>
                                  <span className="badge bg-light text-dark border" style={{ fontSize: '0.62rem', padding: '0.15em 0.4em' }}>
                                    {amenity.scope || 'hotel'}
                                  </span>
                                  {amenity.default_sublabel && (
                                    <span className="text-truncate">{amenity.default_sublabel}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                className={`btn btn-sm p-1 border-0 ${amenity.is_highlight ? 'text-warning' : 'text-muted'}`}
                                title={amenity.is_highlight ? 'Remove Highlight' : 'Mark as Popular Highlight'}
                                onClick={() => handleToggleHighlight(amenity)}
                              >
                                <Star size={14} fill={amenity.is_highlight ? '#f59e0b' : 'none'} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm p-1 text-muted border-0 hover-primary"
                                title="Edit Amenity"
                                onClick={() => setAmenityModal({ open: true, amenity, defaultCategoryId: category.id })}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm p-1 border-0 ${amenity.is_active === 0 ? 'text-success' : 'text-danger'}`}
                                title={amenity.is_active === 0 ? 'Honda PCXte Amenity' : 'Deactivate Amenity'}
                                onClick={() => handleToggleAmenityActive(amenity)}
                              >
                                {amenity.is_active === 0 ? <Check size={13} /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: Custom Amenity Requests
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-4 border shadow-sm overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <tr>
                  <th className="ps-4">Requested Amenity</th>
                  <th>Hotel Property</th>
                  <th>Vendor Partner</th>
                  <th>Category & Scope</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <RefreshCw size={24} className="spin text-primary mb-2" />
                      <div>Loading custom amenity requests...</div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <Clock size={32} className="mb-2 text-muted" />
                      <div className="fw-bold">No custom amenity requests found</div>
                      <div className="small">Requests submitted by hotel vendors will appear here for administrative approval.</div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isPending = (req.status || '').toLowerCase() === 'pending';
                    const isApproved = (req.status || '').toLowerCase() === 'approved';
                    const isRejected = (req.status || '').toLowerCase() === 'rejected';

                    return (
                      <tr key={req.id}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{req.custom_name || req.suggested_name}</div>
                          {req.description && (
                            <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }} title={req.description}>
                              {req.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{req.hotel_name || req.hotel_id}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>ID: {req.hotel_id}</div>
                        </td>
                        <td>
                          <div className="text-dark">{req.vendor_name || req.vendor_id}</div>
                        </td>
                        <td>
                          <div>
                            <span className="badge bg-light text-dark border me-1">
                              {req.suggested_category_id || 'General'}
                            </span>
                            <span className="badge" style={{ background: req.scope === 'room' ? '#e0f2fe' : '#fef3c7', color: req.scope === 'room' ? '#0369a1' : '#b45309' }}>
                              {req.scope || 'hotel'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill px-2.5 py-1 text-uppercase fw-bold`} style={{
                            fontSize: '0.68rem',
                            background: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                            color: isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#b45309'
                          }}>
                            {req.status || 'Pending'}
                          </span>
                        </td>
                        <td className="pe-4 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success px-2.5 py-1 rounded-pill d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => setReviewModal({ open: true, request: req, decision: 'approve' })}
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger px-2.5 py-1 rounded-pill d-flex align-items-center gap-1"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => setReviewModal({ open: true, request: req, decision: 'reject' })}
                                >
                                  <X size={12} /> Reject
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary px-2.5 py-1 rounded-pill"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => setReviewModal({ open: true, request: req, decision: req.status.toLowerCase() })}
                              >
                                View Remarks
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Category Form (Add / Edit)
      ───────────────────────────────────────────────────────────── */}
      {categoryModal.open && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setCategoryModal({ open: false, category: null })}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '500px', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: COLORS.dark }}>
              <h6 className="fw-bold mb-0">{categoryModal.category ? 'Edit Amenity Category' : 'Create Amenity Category'}</h6>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setCategoryModal({ open: false, category: null })}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                handleSaveCategory({
                  id: categoryModal.category?.id || '',
                  name: fd.get('name'),
                  icon: fd.get('icon'),
                  slug: fd.get('slug'),
                  scope: fd.get('scope'),
                  display_order: parseInt(fd.get('display_order') || 0, 10),
                  is_active: fd.get('is_active') ? 1 : 0
                });
              }}
              className="p-4 d-flex flex-column gap-3"
            >
              <div>
                <label className="form-label fw-bold text-muted small">Category Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  defaultValue={categoryModal.category?.name || ''}
                  required
                  placeholder="e.g. Wellness & Spa"
                />
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Icon Name (Lucide)</label>
                  <select name="icon" className="form-select" defaultValue={categoryModal.category?.icon || 'Sparkles'}>
                    {Object.keys(ICON_COMPONENTS).map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Applicable Scope</label>
                  <select name="scope" className="form-select" defaultValue={categoryModal.category?.scope || 'hotel'}>
                    <option value="hotel">Hotel-Level</option>
                    <option value="room">Room-Level</option>
                    <option value="both">Both (Hotel & Room)</option>
                  </select>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">URL Slug</label>
                  <input
                    type="text"
                    name="slug"
                    className="form-control"
                    defaultValue={categoryModal.category?.slug || ''}
                    placeholder="e.g. wellness-spa"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Display Order</label>
                  <input
                    type="number"
                    name="display_order"
                    className="form-control"
                    defaultValue={categoryModal.category?.display_order ?? 10}
                  />
                </div>
              </div>

              <div className="form-check form-switch mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="catActiveSwitch"
                  name="is_active"
                  defaultChecked={categoryModal.category ? categoryModal.category.is_active === 1 : true}
                />
                <label className="form-check-label small fw-semibold" htmlFor="catActiveSwitch">
                  Category is Active and Visible to Vendors & Guests
                </label>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setCategoryModal({ open: false, category: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary px-4 rounded-pill fw-bold"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Master Amenity Form (Add / Edit)
      ───────────────────────────────────────────────────────────── */}
      {amenityModal.open && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setAmenityModal({ open: false, amenity: null, defaultCategoryId: '' })}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '520px', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: COLORS.dark }}>
              <h6 className="fw-bold mb-0">{amenityModal.amenity ? 'Edit Master Amenity' : 'Create Master Amenity'}</h6>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setAmenityModal({ open: false, amenity: null, defaultCategoryId: '' })}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                handleSaveAmenity({
                  id: amenityModal.amenity?.id || '',
                  category_id: fd.get('category_id'),
                  name: fd.get('name'),
                  default_sublabel: fd.get('default_sublabel'),
                  icon: fd.get('icon'),
                  scope: fd.get('scope'),
                  display_order: parseInt(fd.get('display_order') || 0, 10),
                  is_highlight: fd.get('is_highlight') ? 1 : 0,
                  is_active: fd.get('is_active') ? 1 : 0
                });
              }}
              className="p-4 d-flex flex-column gap-3"
            >
              <div>
                <label className="form-label fw-bold text-muted small">Category *</label>
                <select
                  name="category_id"
                  className="form-select"
                  defaultValue={amenityModal.amenity?.category_id || amenityModal.defaultCategoryId}
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.scope || 'hotel'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Amenity Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  defaultValue={amenityModal.amenity?.name || ''}
                  required
                  placeholder="e.g. Free High-Speed Wi-Fi"
                />
              </div>

              <div>
                <label className="form-label fw-bold text-muted small">Default Sub-label / Description</label>
                <input
                  type="text"
                  name="default_sublabel"
                  className="form-control"
                  defaultValue={amenityModal.amenity?.default_sublabel || ''}
                  placeholder="e.g. Available in all rooms & public areas"
                />
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Icon</label>
                  <select name="icon" className="form-select" defaultValue={amenityModal.amenity?.icon || amenityModal.amenity?.icon_name || 'Sparkles'}>
                    {Object.keys(ICON_COMPONENTS).map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Scope</label>
                  <select name="scope" className="form-select" defaultValue={amenityModal.amenity?.scope || 'hotel'}>
                    <option value="hotel">Hotel-Level</option>
                    <option value="room">Room-Level</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between p-2.5 rounded-3 border bg-light mt-1">
                <div>
                  <div className="fw-bold small text-dark">Highlight on Hotel Cards</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Featured in top amenity badges and overview</div>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="highlightSwitch"
                    name="is_highlight"
                    defaultChecked={amenityModal.amenity?.is_highlight === 1}
                  />
                </div>
              </div>

              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="amenityActiveSwitch"
                  name="is_active"
                  defaultChecked={amenityModal.amenity ? amenityModal.amenity.is_active === 1 : true}
                />
                <label className="form-check-label small fw-semibold" htmlFor="amenityActiveSwitch">
                  Amenity is Active and Available for Selection
                </label>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setAmenityModal({ open: false, amenity: null, defaultCategoryId: '' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary px-4 rounded-pill fw-bold"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Amenity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Review Custom Amenity Request
      ───────────────────────────────────────────────────────────── */}
      {reviewModal.open && reviewModal.request && (
        <div className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }} onClick={() => setReviewModal({ open: false, request: null, decision: 'approve' })}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '100%', maxWidth: '550px', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: reviewModal.decision === 'reject' ? COLORS.danger : COLORS.dark }}>
              <div className="d-flex align-items-center gap-2">
                {reviewModal.decision === 'reject' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                <h6 className="fw-bold mb-0">
                  {reviewModal.decision === 'reject' ? 'Reject Custom Amenity' : 'Approve Custom Amenity'}
                </h6>
              </div>
              <button className="btn btn-sm text-white-50 p-0 border-0" onClick={() => setReviewModal({ open: false, request: null, decision: 'approve' })}>
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                handleReviewRequest({
                  request_id: reviewModal.request.id,
                  decision: reviewModal.decision,
                  admin_remarks: fd.get('admin_remarks'),
                  make_global: fd.get('make_global') ? 1 : 0,
                  category_id: fd.get('category_id'),
                  icon_name: fd.get('icon_name')
                });
              }}
              className="p-4 d-flex flex-column gap-3"
            >
              {/* Request Details Card */}
              <div className="p-3 rounded-3 border bg-light">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-bold text-dark fs-6">{reviewModal.request.custom_name || reviewModal.request.suggested_name}</span>
                  <span className="badge bg-secondary">{reviewModal.request.scope || 'hotel'}</span>
                </div>
                <div className="text-muted small mb-2">
                  Property: <strong>{reviewModal.request.hotel_name || reviewModal.request.hotel_id}</strong> • Vendor: {reviewModal.request.vendor_name || reviewModal.request.vendor_id}
                </div>
                {reviewModal.request.description && (
                  <div className="p-2 rounded bg-white border small text-dark">
                    "{reviewModal.request.description}"
                  </div>
                )}
              </div>

              {/* Approval Options: Global Promotion */}
              {reviewModal.decision === 'approve' && (
                <div className="p-3 rounded-3 border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="makeGlobalSwitch"
                      name="make_global"
                      defaultChecked={true}
                    />
                    <label className="form-check-label fw-bold text-dark small" htmlFor="makeGlobalSwitch">
                      Promote to Global Master List for All Hotels
                    </label>
                  </div>
                  <div className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>
                    When enabled, this amenity will be added to the platform master catalog and can be chosen by all other hotels.
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Target Category</label>
                      <select name="category_id" className="form-select form-select-sm" defaultValue={reviewModal.request.suggested_category_id || categories[0]?.id}>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Icon Name</label>
                      <select name="icon_name" className="form-select form-select-sm" defaultValue="Sparkles">
                        {Object.keys(ICON_COMPONENTS).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              <div>
                <label className="form-label fw-bold text-muted small">
                  {reviewModal.decision === 'reject' ? 'Rejection Reason / Remarks *' : 'Admin Remarks (Optional)'}
                </label>
                <textarea
                  name="admin_remarks"
                  className="form-control"
                  rows={3}
                  placeholder={reviewModal.decision === 'reject' ? 'State why this custom amenity cannot be approved...' : 'Internal notes or approval remarks...'}
                  defaultValue={reviewModal.request.admin_remarks || ''}
                  required={reviewModal.decision === 'reject'}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3 rounded-pill"
                  onClick={() => setReviewModal({ open: false, request: null, decision: 'approve' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-sm px-4 rounded-pill fw-bold text-white ${reviewModal.decision === 'reject' ? 'btn-danger' : 'btn-success'}`}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : reviewModal.decision === 'reject' ? 'Confirm Rejection' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
