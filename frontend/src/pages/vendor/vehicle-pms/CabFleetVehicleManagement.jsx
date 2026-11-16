import React, { useState, useEffect } from 'react';
import {
  Car, Plus, Shield, ShieldCheck, AlertCircle, FileText, CheckCircle2,
  XCircle, Wrench, Users, Search, RefreshCw, Loader2, ExternalLink,
  ChevronRight, ToggleLeft, ToggleRight, Trash2, Edit
} from 'lucide-react';
import {
  fetchVendorFleetVehicles,
  createVendorFleetVehicle,
  updateVendorFleetVehicle,
  deleteVendorFleetVehicle,
  assignVehicleToDriver,
  unassignVehicleFromDriver,
  fetchVendorDrivers
} from '../../../services/api';

const CATEGORY_OPTIONS = [
  { value: 'SEDAN', label: 'Prime Sedan', defaultSeats: 4, defaultLuggage: 2, desc: 'Toyota Camry, Altis or similar luxury sedan' },
  { value: 'SUV', label: 'Premium SUV', defaultSeats: 6, defaultLuggage: 4, desc: 'Toyota Fortuner, Isuzu MU-X or similar 4WD' },
  { value: 'VIP_VAN', label: 'VIP Van', defaultSeats: 10, defaultLuggage: 8, desc: 'Toyota Commuter VIP 9-10 seater executive van' }
];

export default function CabFleetVehicleManagement({ currentUser }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    brand: 'Toyota',
    model: '',
    plate_number: '',
    color: 'Pearl White',
    category: 'SEDAN',
    seating_capacity: 4,
    luggage_capacity: 2,
    photo_url: '',
    registration_doc_url: '',
    insurance_doc_url: '',
    permit_doc_url: ''
  });

  const [selectedDriverId, setSelectedDriverId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [vRes, dRes] = await Promise.all([
        fetchVendorFleetVehicles(),
        fetchVendorDrivers()
      ]);

      if (vRes && vRes.success && Array.isArray(vRes.data)) {
        setVehicles(vRes.data);
      } else {
        setVehicles([]);
      }

      if (dRes && dRes.success && Array.isArray(dRes.data)) {
        setDrivers(dRes.data);
      } else {
        setDrivers([]);
      }
    } catch (err) {
      console.error('Failed to load fleet data:', err);
      setErrorMsg('Unable to retrieve fleet vehicle catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCategoryChange = (catVal) => {
    const opt = CATEGORY_OPTIONS.find(o => o.value === catVal);
    setFormData(prev => ({
      ...prev,
      category: catVal,
      seating_capacity: opt?.defaultSeats || prev.seating_capacity,
      luggage_capacity: opt?.defaultLuggage || prev.luggage_capacity
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.plate_number || !formData.color) {
      setErrorMsg('Brand, model, Thai plate number, and color are mandatory.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await createVendorFleetVehicle(formData);
      if (res && res.success) {
        setSuccessMsg(`Vehicle "${formData.brand} ${formData.model}" submitted for verification.`);
        setTimeout(() => setSuccessMsg(''), 5000);
        setShowAddModal(false);
        setFormData({
          brand: 'Toyota',
          model: '',
          plate_number: '',
          color: 'Pearl White',
          category: 'SEDAN',
          seating_capacity: 4,
          luggage_capacity: 2,
          photo_url: '',
          registration_doc_url: '',
          insurance_doc_url: '',
          permit_doc_url: ''
        });
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to register vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error creating vehicle record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedDriverId) {
      setErrorMsg('Please select a chauffeur to assign.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await assignVehicleToDriver(selectedVehicle.id, selectedDriverId);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Chauffeur successfully assigned to vehicle.');
        setTimeout(() => setSuccessMsg(''), 5000);
        setShowAssignModal(false);
        setSelectedVehicle(null);
        setSelectedDriverId('');
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to assign vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error assigning chauffeur.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMaintenance = async (veh) => {
    try {
      const newMaint = veh.is_maintenance ? 0 : 1;
      const res = await updateVendorFleetVehicle(veh.id, { is_maintenance: newMaint, is_available: newMaint ? 0 : 1 });
      if (res && res.success) {
        setSuccessMsg(`Vehicle ${veh.plate_number} marked as ${newMaint ? 'Under Maintenance' : 'Active'}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update vehicle status.');
    }
  };

  const handleDelete = async (veh) => {
    if (!window.confirm(`Are you sure you want to remove vehicle ${veh.plate_number} (${veh.brand} ${veh.model}) from your fleet?`)) {
      return;
    }

    try {
      const res = await deleteVendorFleetVehicle(veh.id);
      if (res && res.success) {
        setSuccessMsg(`Vehicle ${veh.plate_number} removed.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to delete vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error removing vehicle.');
    }
  };

  // Filtered List
  const filteredVehicles = vehicles.filter(v => {
    if (categoryFilter !== 'ALL' && v.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && v.verification_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPlate = (v.plate_number || '').toLowerCase().includes(q);
      const matchModel = (v.model || '').toLowerCase().includes(q);
      const matchBrand = (v.brand || '').toLowerCase().includes(q);
      const matchColor = (v.color || '').toLowerCase().includes(q);
      return matchPlate || matchModel || matchBrand || matchColor;
    }
    return true;
  });

  const totalCount = vehicles.length;
  const approvedCount = vehicles.filter(v => v.verification_status === 'APPROVED' && !v.is_maintenance).length;
  const pendingCount = vehicles.filter(v => v.verification_status === 'PENDING_APPROVAL').length;
  const maintenanceCount = vehicles.filter(v => v.is_maintenance).length;

  return (
    <div className="p-4" style={{ backgroundColor: '#F0F2F5', minHeight: '100%', color: '#0F172A' }}>
      {/* Title & Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 mb-4 border-bottom border-secondary border-opacity-25">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="p-2 rounded-3" style={{ background: 'rgba(255,99,51,0.15)', color: '#FF6333' }}>
              <Car size={24} />
            </span>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: '#0D1B2E' }}>Cab Fleet & Vehicle Management</h4>
              <p className="text-secondary small mb-0">
                Register verified transport vehicles, manage Thai license documentation, and assign chauffeurs.
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 bg-white"
            title="Refresh Fleet"
          >
            <RefreshCw size={14} className={loading ? 'spinner-border spinner-border-sm' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-sm d-flex align-items-center gap-1.5 fw-bold text-white px-3 py-2 rounded-3 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #FF6333 0%, #FF8A00 100%)' }}
          >
            <Plus size={16} />
            <span>Register Vehicle</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3 mb-3" style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d' }}>
          <CheckCircle2 size={16} />
          <span className="small fw-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3 mb-3" style={{ background: 'rgba(239,68,68,0.15)', color: '#b91c1c' }}>
          <AlertCircle size={16} />
          <span className="small fw-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Metric Counters */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 shadow-sm" style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)' }}>
            <div className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Total Fleet</div>
            <div className="fs-3 fw-bold text-dark mt-1">{totalCount}</div>
            <div className="text-secondary small mt-0.5" style={{ fontSize: '0.72rem' }}>Registered vehicles</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 shadow-sm" style={{ background: '#FFFFFF', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="text-success small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Approved & Ready</div>
            <div className="fs-3 fw-bold text-success mt-1">{approvedCount}</div>
            <div className="text-secondary small mt-0.5" style={{ fontSize: '0.72rem' }}>Eligible for dispatches</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 shadow-sm" style={{ background: '#FFFFFF', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="text-warning small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Pending Review</div>
            <div className="fs-3 fw-bold text-warning mt-1">{pendingCount}</div>
            <div className="text-secondary small mt-0.5" style={{ fontSize: '0.72rem' }}>Awaiting Admin approval</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 shadow-sm" style={{ background: '#FFFFFF', border: '1px solid rgba(148,163,184,0.2)' }}>
            <div className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Under Maintenance</div>
            <div className="fs-3 fw-bold text-secondary mt-1">{maintenanceCount}</div>
            <div className="text-secondary small mt-0.5" style={{ fontSize: '0.72rem' }}>Temporarily offline</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 rounded-3 mb-4" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.06)' }}>
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '360px' }}>
          <div className="position-relative w-100">
            <Search size={15} className="position-absolute top-50 translate-middle-y text-secondary" style={{ left: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by plate, brand, model..."
              className="form-control form-control-sm border ps-5"
              style={{ background: '#F8FAFC', fontSize: '0.82rem', height: '36px' }}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select form-select-sm border"
            style={{ background: '#F8FAFC', fontSize: '0.8rem', height: '36px' }}
          >
            <option value="ALL">All Categories</option>
            <option value="SEDAN">Prime Sedan</option>
            <option value="SUV">Premium SUV</option>
            <option value="VIP_VAN">VIP Van</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select form-select-sm border"
            style={{ background: '#F8FAFC', fontSize: '0.8rem', height: '36px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING_APPROVAL">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="text-center py-5">
          <Loader2 className="spinner-border text-warning" size={32} />
          <div className="text-secondary small mt-2">Loading vehicle fleet...</div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-5 rounded-3 p-4" style={{ background: '#FFFFFF', border: '1px dashed rgba(15,23,42,0.15)' }}>
          <Car size={40} className="text-secondary opacity-50 mb-2" />
          <h6 className="fw-bold text-dark mb-1">No Fleet Vehicles Found</h6>
          <p className="text-secondary small mb-3">
            {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No vehicles match your active filters.'
              : 'You have not registered any cab transfer vehicles yet.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-sm text-white fw-semibold px-3 py-1.5 rounded-3"
            style={{ background: '#FF6333' }}
          >
            Register First Vehicle
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {filteredVehicles.map(veh => {
            const isApproved = veh.verification_status === 'APPROVED';
            const isPending = veh.verification_status === 'PENDING_APPROVAL';
            const isRejected = veh.verification_status === 'REJECTED';
            const assignedDrivers = Array.isArray(veh.assigned_drivers) ? veh.assigned_drivers : [];

            return (
              <div key={veh.id} className="col-12 col-md-6 col-xl-4">
                <div
                  className="rounded-3 overflow-hidden d-flex flex-column justify-content-between h-100"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
                    border: `1px solid ${veh.is_maintenance ? 'rgba(148,163,184,0.2)' : isApproved ? 'rgba(34,197,94,0.2)' : isPending ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}
                >
                  {/* Photo & Status Badge */}
                  <div className="position-relative" style={{ height: '140px', background: '#E2E8F0', overflow: 'hidden' }}>
                    {veh.photo_url ? (
                      <img
                        src={veh.photo_url}
                        alt={`${veh.brand} ${veh.model}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
                        <Car size={32} className="opacity-40 mb-1" />
                        <span style={{ fontSize: '0.72rem' }}>No Photo Uploaded</span>
                      </div>
                    )}

                    {/* Verification Status Badge */}
                    <div className="position-absolute top-0 start-0 m-2">
                      {isApproved && (
                        <span className="badge d-flex align-items-center gap-1 px-2.5 py-1 rounded-pill" style={{ background: 'rgba(34,197,94,0.9)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.68rem' }}>
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="badge d-flex align-items-center gap-1 px-2.5 py-1 rounded-pill" style={{ background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.68rem' }}>
                          <AlertCircle size={12} /> Pending Admin Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="badge d-flex align-items-center gap-1 px-2.5 py-1 rounded-pill" style={{ background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.68rem' }}>
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </div>

                    {/* Category Tag */}
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge px-2 py-1 rounded-pill fw-bold" style={{ background: 'rgba(13,27,46,0.85)', backdropFilter: 'blur(4px)', color: '#00B8D9', fontSize: '0.68rem', border: '1px solid rgba(0,184,217,0.3)' }}>
                        {veh.category === 'VIP_VAN' ? 'VIP Van' : veh.category === 'SUV' ? 'Premium SUV' : 'Prime Sedan'}
                      </span>
                    </div>

                    {veh.is_maintenance ? (
                      <div className="position-absolute bottom-0 start-0 end-0 py-1 text-center" style={{ background: 'rgba(234,88,12,0.9)', color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>
                        <Wrench size={12} className="me-1 inline" /> UNDER MAINTENANCE
                      </div>
                    ) : null}
                  </div>

                  {/* Body Content */}
                  <div className="p-3 flex-grow-1">
                    <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                      <div>
                        <h6 className="fw-bold text-dark mb-0">{veh.brand} {veh.model}</h6>
                        <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>Color: {veh.color}</span>
                      </div>
                      {/* Thai Registration Plate */}
                      <span
                        className="font-monospace fw-bold px-2 py-1 rounded border shadow-sm"
                        style={{
                          background: '#0D1B2E',
                          color: '#FACC15',
                          borderColor: '#CA8A04',
                          fontSize: '0.78rem',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {veh.plate_number}
                      </span>
                    </div>

                    {/* Capacity Specs */}
                    <div className="d-flex align-items-center gap-2 mb-3 py-1.5 px-2 rounded-2" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.73rem' }}>
                      <span className="text-muted">Pax: <strong className="text-dark">{veh.seating_capacity} Seats</strong></span>
                      <span className="text-muted">•</span>
                      <span className="text-muted">Luggage: <strong className="text-dark">{veh.luggage_capacity} Bags</strong></span>
                    </div>

                    {/* Assigned Chauffeur */}
                    <div className="mb-3 p-2 rounded-2" style={{ background: 'rgba(0,184,217,0.05)', border: '1px solid rgba(0,184,217,0.15)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="text-secondary small d-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                          <Users size={12} style={{ color: '#00B8D9' }} /> Assigned Chauffeur:
                        </span>
                        {isApproved && (
                          <button
                            onClick={() => {
                              setSelectedVehicle(veh);
                              setShowAssignModal(true);
                            }}
                            className="btn btn-link p-0 text-decoration-none fw-bold"
                            style={{ color: '#FF6333', fontSize: '0.68rem' }}
                          >
                            {assignedDrivers.length > 0 ? '+ Reassign' : '+ Assign'}
                          </button>
                        )}
                      </div>
                      {assignedDrivers.length > 0 ? (
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <span className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                              {assignedDrivers[0].driver_name}
                            </span>
                            <span className="text-secondary small ms-2" style={{ fontSize: '0.7rem' }}>
                              {assignedDrivers[0].driver_phone}
                            </span>
                          </div>
                          {assignedDrivers[0].is_active ? (
                            <span className="badge bg-success bg-opacity-25 text-success border border-success" style={{ fontSize: '0.62rem' }}>ACTIVE SHIFT</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted fst-italic" style={{ fontSize: '0.74rem' }}>
                          No chauffeur assigned yet
                        </span>
                      )}
                    </div>

                    {/* Documents & Verification status */}
                    <div className="d-flex align-items-center gap-2 pt-2 border-top border-secondary border-opacity-10" style={{ fontSize: '0.7rem' }}>
                      <span className="text-secondary">Docs:</span>
                      {veh.registration_doc_url ? (
                        <a href={veh.registration_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-info bg-opacity-10 text-info text-decoration-none d-flex align-items-center gap-0.5">
                          Reg <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-muted">No Reg</span>
                      )}
                      {veh.insurance_doc_url ? (
                        <a href={veh.insurance_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-info bg-opacity-10 text-info text-decoration-none d-flex align-items-center gap-0.5">
                          Ins <ExternalLink size={10} />
                        </a>
                      ) : null}
                      {veh.permit_doc_url ? (
                        <a href={veh.permit_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-info bg-opacity-10 text-info text-decoration-none d-flex align-items-center gap-0.5">
                          Permit <ExternalLink size={10} />
                        </a>
                      ) : null}
                    </div>

                    {/* Rejection reason if applicable */}
                    {isRejected && veh.rejection_reason && (
                      <div className="mt-2 p-2 rounded bg-danger bg-opacity-15 text-danger small" style={{ fontSize: '0.72rem' }}>
                        <strong>Rejection Reason:</strong> {veh.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 pt-0 d-flex align-items-center justify-content-between">
                    <button
                      onClick={() => handleToggleMaintenance(veh)}
                      className={`btn btn-sm d-flex align-items-center gap-1 border-0 ${veh.is_maintenance ? 'text-warning' : 'text-secondary'}`}
                      style={{ background: '#F1F5F9', fontSize: '0.72rem' }}
                      title={veh.is_maintenance ? 'Remove maintenance status' : 'Mark vehicle under maintenance'}
                    >
                      <Wrench size={13} />
                      <span>{veh.is_maintenance ? 'Exit Maintenance' : 'Maintenance'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(veh)}
                      className="btn btn-sm text-danger border-0 d-flex align-items-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.1)', fontSize: '0.72rem' }}
                      title="Delete vehicle"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REGISTER NEW VEHICLE */}
      {showAddModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 1060 }}>
          <div className="rounded-3 p-4 shadow-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', width: '92%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-25">
              <div className="d-flex align-items-center gap-2">
                <Car size={20} style={{ color: '#FF6333' }} />
                <h5 className="fw-bold text-dark mb-0">Register New Transfer Vehicle</h5>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-sm btn-light border-0">✕</button>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              {/* Category Selector */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Service Category</label>
                <div className="row g-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <div key={opt.value} className="col-4">
                      <div
                        onClick={() => handleCategoryChange(opt.value)}
                        className="p-2.5 rounded-2 text-center cursor-pointer"
                        style={{
                          background: formData.category === opt.value ? 'rgba(255,99,51,0.1)' : '#F8FAFC',
                          border: `1.5px solid ${formData.category === opt.value ? '#FF6333' : '#E2E8F0'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>{opt.label}</div>
                        <div className="text-secondary mt-0.5" style={{ fontSize: '0.65rem' }}>{opt.defaultSeats} Seats • {opt.defaultLuggage} Bags</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand & Model */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Brand / Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Toyota, Mercedes"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. Camry 2.5 HEV, Fortuner GR"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  />
                </div>
              </div>

              {/* Thai License Plate & Color */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Thai Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    placeholder="e.g. 1กข 4589"
                    className="form-control form-control-sm font-monospace fw-bold"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#B45309' }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Vehicle Color *</label>
                  <input
                    type="text"
                    required
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g. Pearl White, Attitude Black"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  />
                </div>
              </div>

              {/* Passenger & Luggage Capacity */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Seating Capacity (Pax excluding driver) *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.seating_capacity}
                    onChange={(e) => setFormData({ ...formData, seating_capacity: parseInt(e.target.value, 10) })}
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-secondary small fw-semibold">Luggage Capacity (Pieces) *</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={formData.luggage_capacity}
                    onChange={(e) => setFormData({ ...formData, luggage_capacity: parseInt(e.target.value, 10) })}
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  />
                </div>
              </div>

              {/* Vehicle Photo URL */}
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Vehicle Photograph URL</label>
                <input
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://images.unsplash.com/... or uploaded photo link"
                  className="form-control form-control-sm"
                  style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                />
              </div>

              {/* Document URLs (DLT, Insurance, Transport Permit) */}
              <div className="p-3 rounded-2 mb-3" style={{ background: 'rgba(0,184,217,0.05)', border: '1px solid rgba(0,184,217,0.15)' }}>
                <div className="d-flex align-items-center gap-1.5 mb-2 text-info small fw-bold">
                  <ShieldCheck size={14} /> Thai Transport Document Verification Links
                </div>

                <div className="mb-2">
                  <label className="form-label text-secondary small" style={{ fontSize: '0.72rem' }}>Vehicle Registration Book (เล่มทะเบียน) URL</label>
                  <input
                    type="url"
                    value={formData.registration_doc_url}
                    onChange={(e) => setFormData({ ...formData, registration_doc_url: e.target.value })}
                    placeholder="https://wowthailand.com/docs/car_reg.pdf"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0', fontSize: '0.78rem' }}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label text-secondary small" style={{ fontSize: '0.72rem' }}>Commercial Insurance Certificate (พ.ร.บ. / ประกันภัย) URL</label>
                  <input
                    type="url"
                    value={formData.insurance_doc_url}
                    onChange={(e) => setFormData({ ...formData, insurance_doc_url: e.target.value })}
                    placeholder="https://wowthailand.com/docs/insurance.pdf"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0', fontSize: '0.78rem' }}
                  />
                </div>

                <div>
                  <label className="form-label text-secondary small" style={{ fontSize: '0.72rem' }}>Public Transport Permit / DLT Permit URL</label>
                  <input
                    type="url"
                    value={formData.permit_doc_url}
                    onChange={(e) => setFormData({ ...formData, permit_doc_url: e.target.value })}
                    placeholder="https://wowthailand.com/docs/permit.pdf"
                    className="form-control form-control-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-sm text-white fw-bold px-4"
                  style={{ background: 'linear-gradient(135deg, #FF6333 0%, #FF8A00 100%)' }}
                >
                  {actionLoading ? <Loader2 size={14} className="spinner-border spinner-border-sm me-1" /> : null}
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN VEHICLE TO REGISTERED CHAUFFEUR */}
      {showAssignModal && selectedVehicle && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 1060 }}>
          <div className="rounded-3 p-4 shadow-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', width: '92%', maxWidth: '480px' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-25">
              <div className="d-flex align-items-center gap-2">
                <Users size={18} style={{ color: '#00B8D9' }} />
                <h6 className="fw-bold text-dark mb-0">Assign Chauffeur to Vehicle</h6>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="btn btn-sm btn-light border-0">✕</button>
            </div>

            <div className="p-2.5 rounded-2 mb-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>Selected Vehicle:</div>
              <div className="d-flex align-items-center justify-content-between mt-1">
                <strong className="text-dark">{selectedVehicle.brand} {selectedVehicle.model}</strong>
                <span className="font-monospace text-warning fw-bold px-2 py-0.5 rounded bg-dark border border-secondary" style={{ fontSize: '0.75rem' }}>
                  {selectedVehicle.plate_number}
                </span>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="mb-4">
                <label className="form-label text-secondary small fw-semibold">Select Chauffeur from Roster</label>
                {drivers.length === 0 ? (
                  <div className="text-warning small p-2 rounded bg-warning bg-opacity-10">
                    No chauffeurs found in roster. Please add drivers under the "Chauffeur Roster" tab first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="form-select form-select-sm"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}
                  >
                    <option value="">-- Choose Chauffeur --</option>
                    {drivers.map(drv => (
                      <option key={drv.id} value={drv.id}>
                        {drv.full_name} ({drv.phone}) - DL: {drv.license_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || drivers.length === 0 || !selectedDriverId}
                  className="btn btn-sm text-white fw-bold px-4"
                  style={{ background: 'linear-gradient(135deg, #00B8D9 0%, #0088A3 100%)' }}
                >
                  {actionLoading ? <Loader2 size={14} className="spinner-border spinner-border-sm me-1" /> : null}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

