import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Phone, Car, Shield, ShieldCheck, AlertCircle,
  Search, Check, X, Edit, Trash2, Loader2, RefreshCw, Award
} from 'lucide-react';
import {
  fetchVendorDrivers,
  createVendorDriver,
  updateVendorDriver,
  deleteVendorDriver
} from '../../../services/api';

export default function VendorChauffeurRoster({ currentUser }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    vehicle_model: 'Toyota Commuter VIP',
    vehicle_plate: ''
  });

  const loadDrivers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchVendorDrivers();
      if (res && res.success && Array.isArray(res.data)) {
        setDrivers(res.data);
      } else {
        setDrivers([]);
      }
    } catch (err) {
      console.error('Failed to load vendor drivers:', err);
      setErrorMsg('Unable to load chauffeur roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone || !formData.license_number) {
      setErrorMsg('Please enter name, phone, and Thai driving license number.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await createVendorDriver(formData);
      if (res && res.success) {
        setSuccessMsg(`Chauffeur "${formData.full_name}" registered successfully.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowAddModal(false);
        setFormData({
          full_name: '',
          phone: '',
          license_number: '',
          vehicle_model: 'Toyota Commuter VIP',
          vehicle_plate: ''
        });
        await loadDrivers();
      } else {
        setErrorMsg(res?.error || 'Failed to register chauffeur.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error creating chauffeur record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await updateVendorDriver(selectedDriver.id, formData);
      if (res && res.success) {
        setSuccessMsg(`Chauffeur details updated successfully.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowEditModal(false);
        setSelectedDriver(null);
        await loadDrivers();
      } else {
        setErrorMsg(res?.error || 'Failed to update chauffeur.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating chauffeur details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (driver) => {
    const nextStatus = driver.status === 'available' ? 'offline' : 'available';
    try {
      const res = await updateVendorDriver(driver.id, { status: nextStatus });
      if (res && res.success) {
        setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: nextStatus } : d));
      }
    } catch (err) {
      console.error('Failed to toggle driver status:', err);
    }
  };

  const handleDeleteDriver = async (driver) => {
    if (!window.confirm(`Are you sure you want to remove chauffeur "${driver.full_name}" from your roster?`)) {
      return;
    }

    try {
      const res = await deleteVendorDriver(driver.id);
      if (res && res.success) {
        setSuccessMsg('Chauffeur successfully unlinked from roster.');
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadDrivers();
      } else {
        setErrorMsg(res?.error || 'Failed to remove chauffeur.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error removing chauffeur.');
    }
  };

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase();
    const matchQ = (d.full_name || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.license_number || '').toLowerCase().includes(q) ||
      (d.vehicle_plate || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (d.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchQ && matchStatus;
  });

  const availableCount = drivers.filter(d => (d.status || '').toLowerCase() === 'available').length;
  const onTripCount = drivers.filter(d => (d.status || '').toLowerCase() === 'on_trip').length;

  return (
    <div className="p-4" style={{ height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#0D1B2E' }}>Chauffeur Fleet Roster</h4>
          <p className="text-muted mb-0 small">
            Manage your certified professional drivers, vehicle assignments, and duty status for WOW THAILAND transfers.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={loadDrivers}
            className="btn btn-sm btn-outline-secondary rounded-3 d-flex align-items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setFormData({
                full_name: '',
                phone: '',
                license_number: '',
                vehicle_model: 'Toyota Commuter VIP',
                vehicle_plate: ''
              });
              setShowAddModal(true);
            }}
            className="btn btn-sm text-dark rounded-3 d-flex align-items-center gap-1.5 fw-bold shadow-xs"
            style={{ background: 'linear-gradient(90deg,#F5C518,#E5A826)' }}
          >
            <UserPlus size={15} />
            <span>Register Chauffeur</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Total Chauffeurs</span>
            <div className="fs-4 fw-black text-dark font-heading mt-1">{drivers.length}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Registered under your fleet</span>
          </div>
        </div>
        <div className="col-12 col-sm-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Available On Duty</span>
            <div className="fs-4 fw-black text-success font-heading mt-1">{availableCount}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Ready for transfer dispatch</span>
          </div>
        </div>
        <div className="col-12 col-sm-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Currently On Trip</span>
            <div className="fs-4 fw-black text-primary font-heading mt-1">{onTripCount}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Executing active transfers</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 rounded-3 small d-flex align-items-center gap-2 mb-3">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 rounded-3 small d-flex align-items-center gap-2 mb-3">
          <Check size={15} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="position-relative" style={{ maxWidth: '320px', width: '100%' }}>
          <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-2.5 text-muted" />
          <input
            type="text"
            className="form-control form-control-sm ps-5 rounded-3"
            placeholder="Search name, phone, plate, license..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="d-flex align-items-center gap-1.5">
          {['all', 'available', 'on_trip', 'offline'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm rounded-pill px-3 py-1 fw-bold text-uppercase ${
                statusFilter === st ? 'btn-dark' : 'btn-light text-muted'
              }`}
              style={{ fontSize: '0.7rem' }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Chauffeur Table Card */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light border-bottom">
              <tr style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                <th className="ps-3 py-3">Chauffeur</th>
                <th className="py-3">Contact</th>
                <th className="py-3">Driving License</th>
                <th className="py-3">Vehicle Details</th>
                <th className="py-3">Duty Status</th>
                <th className="pe-3 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.82rem' }}>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                    <div>Loading chauffeur roster...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <Users size={32} className="mb-2 text-muted opacity-50 d-inline-block" />
                    <div className="fw-bold">No chauffeurs found</div>
                    <div className="small">Register your first driver to assign incoming transfer duties.</div>
                  </td>
                </tr>
              ) : (
                filtered.map(driver => {
                  const isAvailable = (driver.status || '').toLowerCase() === 'available';
                  const isOnTrip = (driver.status || '').toLowerCase() === 'on_trip';
                  return (
                    <tr key={driver.id}>
                      <td className="ps-3 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                            style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #0D1B2E, #1C2541)' }}
                          >
                            {(driver.full_name || 'D')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{driver.full_name}</div>
                            <div className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>ID: {driver.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-1 text-dark">
                          <Phone size={13} className="text-muted" />
                          <span>{driver.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-light text-dark font-monospace border px-2 py-1">
                          {driver.license_number || 'TH-DL-PENDING'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold text-dark">{driver.vehicle_model || 'Standard Sedan'}</div>
                          <span className="badge bg-dark text-white font-monospace px-1.5 py-0.5 mt-0.5" style={{ fontSize: '0.68rem' }}>
                            {driver.vehicle_plate || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`badge rounded-pill px-2.5 py-1 text-uppercase fw-bold ${
                          isAvailable ? 'bg-success text-white' : isOnTrip ? 'bg-primary text-white' : 'bg-secondary text-white'
                        }`} style={{ fontSize: '0.68rem' }}>
                          {driver.status || 'Offline'}
                        </span>
                      </td>
                      <td className="pe-3 py-3 text-end">
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(driver)}
                            disabled={isOnTrip}
                            className={`btn btn-sm rounded-2 px-2 py-1 ${isAvailable ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            title={isOnTrip ? 'Cannot toggle while on trip' : isAvailable ? 'Go Offline' : 'Go Available'}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {isAvailable ? 'Set Offline' : 'Set Available'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setFormData({
                                full_name: driver.full_name || '',
                                phone: driver.phone || '',
                                license_number: driver.license_number || '',
                                vehicle_model: driver.vehicle_model || 'Toyota Commuter VIP',
                                vehicle_plate: driver.vehicle_plate || ''
                              });
                              setShowEditModal(true);
                            }}
                            className="btn btn-sm btn-light border rounded-2 p-1 text-muted"
                            title="Edit Chauffeur"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDriver(driver)}
                            disabled={isOnTrip}
                            className="btn btn-sm btn-light border rounded-2 p-1 text-danger"
                            title="Unlink Chauffeur"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* REGISTER CHAUFFEUR MODAL */}
      {showAddModal && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-2 p-1.5 bg-primary bg-opacity-10 text-primary">
                  <UserPlus size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark">Register Chauffeur to Fleet</h6>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="btn btn-sm btn-link text-muted p-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Somchai Prasert"
                  className="form-control form-control-sm rounded-2"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Phone Number (Login &amp; SMS) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +66 83 456 7890"
                  className="form-control form-control-sm rounded-2"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Thai Driving License Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TH-DL-987234"
                  className="form-control form-control-sm rounded-2"
                  value={formData.license_number}
                  onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Assigned Vehicle Model</label>
                <select
                  className="form-select form-select-sm rounded-2"
                  value={formData.vehicle_model}
                  onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })}
                >
                  <option value="Toyota Camry VIP">Toyota Camry VIP (Sedan)</option>
                  <option value="Toyota Fortuner SUV">Toyota Fortuner SUV (SUV)</option>
                  <option value="Toyota Commuter VIP">Toyota Commuter VIP (9-Seater Van)</option>
                  <option value="Mercedes-Benz E-Class">Mercedes-Benz E-Class (Executive)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-dark mb-1">Vehicle Registration Plate</label>
                <input
                  type="text"
                  placeholder="e.g. 1กข 4589"
                  className="form-control form-control-sm rounded-2"
                  value={formData.vehicle_plate}
                  onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })}
                />
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-sm btn-light rounded-2 px-3 fw-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-sm text-dark rounded-2 px-4 fw-bold"
                  style={{ background: 'linear-gradient(90deg,#F5C518,#E5A826)' }}
                >
                  {actionLoading ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHAUFFEUR MODAL */}
      {showEditModal && selectedDriver && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-2 p-1.5 bg-warning bg-opacity-10 text-warning">
                  <Edit size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark">Update Chauffeur: {selectedDriver.full_name}</h6>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="btn btn-sm btn-link text-muted p-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control form-control-sm rounded-2"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  className="form-control form-control-sm rounded-2"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Thai Driving License Number</label>
                <input
                  type="text"
                  required
                  className="form-control form-control-sm rounded-2"
                  value={formData.license_number}
                  onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label small fw-bold text-dark mb-1">Vehicle Model</label>
                <input
                  type="text"
                  className="form-control form-control-sm rounded-2"
                  value={formData.vehicle_model}
                  onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-dark mb-1">Vehicle Registration Plate</label>
                <input
                  type="text"
                  className="form-control form-control-sm rounded-2"
                  value={formData.vehicle_plate}
                  onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value })}
                />
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-sm btn-light rounded-2 px-3 fw-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-sm text-dark rounded-2 px-4 fw-bold"
                  style={{ background: 'linear-gradient(90deg,#F5C518,#E5A826)' }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

