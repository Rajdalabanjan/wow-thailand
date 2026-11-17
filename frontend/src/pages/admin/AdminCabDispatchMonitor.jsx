import React, { useState, useEffect, useRef } from 'react';
import {
  Car, Compass, Calendar, Clock, MapPin, User, Phone, Check,
  AlertCircle, Search, RefreshCw, Loader2, ArrowRight, ShieldCheck,
  Send, UserCheck, AlertTriangle, Navigation, Sliders, DollarSign,
  X, CheckCircle2, Map, FileText, CheckCheck, XCircle, ExternalLink, BellRing
} from 'lucide-react';
import { connectLiveRooms } from '../../utils/liveSocket';
import { withGpsTimestamps, applyDriverLocation } from '../../utils/driverGps';
import DriverGpsCell, { LiveGpsBadge } from '../../components/cab/DriverGpsCell';
import DriverLiveMapModal from '../../components/cab/DriverLiveMapModal';
import {
  fetchCabDispatches,
  assignCabDriver,
  fetchDrivers,
  fetchVendorDrivers,
  updateCabPricing,
  fetchAdminFleetVehicles,
  verifyAdminFleetVehicle
} from '../../services/api';
import { playNotificationSound } from '../../utils/notificationSound';
import {
  CATEGORY_LABEL,
  DISPATCH_POLL_MS,
  groupSizeLabel,
  driverFitProblem,
  findNewOpenJobs
} from '../../utils/cabDispatchHelpers';

const PICKUP_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Pickup times are saved as Thailand (Asia/Bangkok) wall-clock time. The API returns them
// like "2026-11-13T10:00:00.000Z": the digits are already Thai time and the "Z" is only added
// by the database driver. So the digits are shown exactly as saved, with no timezone
// conversion, and labelled as Thailand time. Example: "13 November 2026, 10:00 AM".
function formatThaiPickupTime(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return String(value);
  const hour = Number(m[4]);
  return `${Number(m[3])} ${PICKUP_MONTHS[Number(m[2]) - 1]} ${m[1]}, ${hour % 12 || 12}:${m[5]} ${hour < 12 ? 'AM' : 'PM'}`;
}

export default function AdminCabDispatchMonitor({ currentUser }) {
  const [dispatches, setDispatches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reassign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Pricing Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingTiers, setPricingTiers] = useState({
    tier_id: 'tier-sedan',
    base_fare_thb: 300,
    per_km_rate_thb: 15,
    minimum_fare_thb: 350
  });

  // View Mode: 'dispatches' | 'fleet_verification'
  const [viewTab, setViewTab] = useState('dispatches');
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetStatusFilter, setFleetStatusFilter] = useState('ALL');

  const loadFleetVehicles = async () => {
    setFleetLoading(true);
    try {
      const res = await fetchAdminFleetVehicles();
      if (res && res.success && Array.isArray(res.data)) {
        setFleetVehicles(res.data);
      } else {
        setFleetVehicles([]);
      }
    } catch (err) {
      console.error('Failed to load fleet oversight:', err);
    } finally {
      setFleetLoading(false);
    }
  };

  const handleApproveVehicle = async (vehId) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyAdminFleetVehicle(vehId, 'APPROVED');
      if (res && res.success) {
        setSuccessMsg(`Vehicle ${vehId} approved for transfers.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadFleetVehicles();
      } else {
        setErrorMsg(res?.error || 'Failed to approve vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVehicle = async (vehId) => {
    const reason = window.prompt('Enter reason for vehicle document rejection:', 'Document blurred, expired, or non-compliant with Thai DLT regulations');
    if (!reason) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyAdminFleetVehicle(vehId, 'REJECTED', reason);
      if (res && res.success) {
        setSuccessMsg(`Vehicle ${vehId} marked as rejected.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadFleetVehicles();
      } else {
        setErrorMsg(res?.error || 'Failed to reject vehicle.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  // New-booking alerts: ids already shown, so only genuinely new jobs ring the bell
  const seenDispatchIds = useRef(null);
  const [newJobAlert, setNewJobAlert] = useState(null);

  // Driver list with each driver's active vehicle size; falls back to the legacy list
  const loadDriverRoster = async () => {
    const rosterRes = await fetchVendorDrivers();
    if (rosterRes && rosterRes.success && Array.isArray(rosterRes.data)) return rosterRes.data;
    const legacy = await fetchDrivers();
    return Array.isArray(legacy) ? legacy : [];
  };

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setErrorMsg('');
    }
    try {
      const [dispRes, drvList] = await Promise.all([
        fetchCabDispatches({ date: dateFilter }),
        loadDriverRoster()
      ]);

      if (dispRes && dispRes.success && Array.isArray(dispRes.data)) {
        const list = dispRes.data;
        if (seenDispatchIds.current) {
          const fresh = findNewOpenJobs(seenDispatchIds.current, list);
          if (fresh.length > 0) {
            setNewJobAlert({ count: fresh.length, first: fresh[0] });
            playNotificationSound('cab_new_booking');
          }
        }
        seenDispatchIds.current = new Set(list.map(d => d.id));
        setDispatches(withGpsTimestamps(list));
      } else if (!silent) {
        setDispatches([]);
      }

      setDrivers(drvList);
      if (!silent) loadFleetVehicles();
    } catch (err) {
      console.error('Failed to load admin cab dispatches:', err);
      if (!silent) setErrorMsg('Unable to retrieve central dispatch data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // A new date filter is a new list; don't treat its rows as new bookings
    seenDispatchIds.current = null;
    loadData();
    // Check for new customer bookings every few seconds
    const timer = setInterval(() => loadData({ silent: true }), DISPATCH_POLL_MS);
    return () => clearInterval(timer);
  }, [dateFilter]);

  // Driver positions are pushed here the moment the driver app sends them
  const [liveStatus, setLiveStatus] = useState('connecting');
  useEffect(() => connectLiveRooms({
    rooms: ['admin'],
    events: {
      DRIVER_LOCATION_UPDATE: (data) => setDispatches(prev => applyDriverLocation(prev, data))
    },
    onStatus: setLiveStatus
  }), []);

  // Live map pop-up for one ride (reads the row from `dispatches`, so it moves with each update)
  const [trackDispatchId, setTrackDispatchId] = useState(null);
  const trackedDispatch = trackDispatchId ? dispatches.find(d => d.id === trackDispatchId) : null;

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDispatch || !assignDriverId) {
      setErrorMsg('Please select a driver to assign.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await assignCabDriver(selectedDispatch.id, assignDriverId);
      if (res && res.success) {
        setSuccessMsg(`Driver successfully assigned to transfer #${selectedDispatch.id}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowAssignModal(false);
        setSelectedDispatch(null);
        setAssignDriverId('');
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to assign driver.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error executing driver assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await updateCabPricing(pricingTiers);
      if (res && res.success) {
        setSuccessMsg(`Rate card for ${pricingTiers.tier_id} updated successfully.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowPricingModal(false);
      } else {
        setErrorMsg(res?.error || 'Failed to update pricing rules.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating transfer pricing.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = dispatches.filter(d => {
    const q = search.toLowerCase();
    const matchQ = (d.id || '').toLowerCase().includes(q) ||
      (d.booking_id || '').toLowerCase().includes(q) ||
      (d.customer_name || '').toLowerCase().includes(q) ||
      (d.customer_phone || '').includes(q) ||
      (d.pickup_address || '').toLowerCase().includes(q) ||
      (d.dropoff_address || '').toLowerCase().includes(q) ||
      (d.driver_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (d.ride_status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchQ && matchStatus;
  });

  const totalDispatches = dispatches.length;
  const onTripCount = dispatches.filter(d => d.ride_status === 'ON_TRIP').length;
  const allocatedCount = dispatches.filter(d => d.ride_status === 'ALLOCATED').length;
  const dispatchedCount = dispatches.filter(d => d.ride_status === 'DISPATCHED' || d.ride_status === 'ARRIVED').length;
  const completedCount = dispatches.filter(d => d.ride_status === 'COMPLETED').length;
  const totalRevenueThb = dispatches.reduce((acc, d) => acc + (parseFloat(d.total_fare_thb || d.base_fare_thb) || 0), 0);

  return (
    <div className="p-4" style={{ height: 'calc(100vh - 65px)', overflowY: 'auto' }}>
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold mb-0 text-dark font-heading">Cab &amp; Transfer Central Dispatch Monitor</h4>
            <span className="badge bg-dark text-warning border px-2 py-0.5 small" style={{ fontSize: '0.68rem' }}>
              ROYAL SIAM MOBILITY
            </span>
          </div>
          <p className="text-muted mb-0 small mt-1">
            Real-time operations radar: Monitor active transfers, live GPS coordinates, verify chauffeur assignments, and adjust rate cards.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <LiveGpsBadge status={liveStatus} fallbackSeconds={DISPATCH_POLL_MS / 1000} />
          <button
            onClick={() => setShowPricingModal(true)}
            className="btn btn-sm btn-outline-dark rounded-3 d-flex align-items-center gap-1.5 fw-semibold"
          >
            <Sliders size={14} />
            <span>Pricing Rules</span>
          </button>
          <button
            onClick={() => loadData()}
            className="btn btn-sm btn-outline-secondary rounded-3 d-flex align-items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Live Sync</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-2.4 col-md-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.68rem' }}>Total Dispatches</span>
            <div className="fs-4 fw-black text-dark font-heading mt-0.5">{totalDispatches}</div>
            <span className="text-muted" style={{ fontSize: '0.70rem' }}>Authoritative records</span>
          </div>
        </div>
        <div className="col-6 col-lg-2.4 col-md-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.68rem' }}>Pending Driver</span>
            <div className="fs-4 fw-black text-warning font-heading mt-0.5">{allocatedCount}</div>
            <span className="text-muted" style={{ fontSize: '0.70rem' }}>Awaiting allocation</span>
          </div>
        </div>
        <div className="col-6 col-lg-2.4 col-md-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.68rem' }}>Dispatched / Arrived</span>
            <div className="fs-4 fw-black text-info font-heading mt-0.5">{dispatchedCount}</div>
            <span className="text-muted" style={{ fontSize: '0.70rem' }}>Chauffeur en route</span>
          </div>
        </div>
        <div className="col-6 col-lg-2.4 col-md-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.68rem' }}>Live On Trip</span>
            <div className="fs-4 fw-black text-success font-heading mt-0.5 d-flex align-items-center gap-1.5">
              <span>{onTripCount}</span>
              {onTripCount > 0 && <span className="rounded-circle bg-success" style={{ width: '8px', height: '8px' }}></span>}
            </div>
            <span className="text-muted" style={{ fontSize: '0.70rem' }}>Passengers in vehicle</span>
          </div>
        </div>
        <div className="col-12 col-lg-2.4 col-md-4">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.68rem' }}>Gross Fare (THB)</span>
            <div className="fs-4 fw-black text-primary font-heading mt-0.5">฿{Math.round(totalRevenueThb).toLocaleString()}</div>
            <span className="text-muted" style={{ fontSize: '0.70rem' }}>Completed: {completedCount} trips</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {newJobAlert && (
        <div className="alert alert-warning py-2 px-3 rounded-3 small d-flex align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <BellRing size={15} className="flex-shrink-0" />
            <span>
              <strong>
                {newJobAlert.count === 1 ? 'New cab booking waiting for a driver' : `${newJobAlert.count} new cab bookings waiting for a driver`}
              </strong>
              {' · '}{newJobAlert.first.pickup_address} · {groupSizeLabel(newJobAlert.first)} · {CATEGORY_LABEL[newJobAlert.first.vehicle_category] || newJobAlert.first.vehicle_category}
              {newJobAlert.first.vendor_id ? ` · vendor ${newJobAlert.first.vendor_id}` : ''}
            </span>
          </div>
          <button type="button" onClick={() => setNewJobAlert(null)} className="btn btn-sm btn-link text-dark p-0" title="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
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

      {/* Navigation Tabs */}
      <div className="d-flex align-items-center gap-2 mb-4 border-bottom pb-2">
        <button
          onClick={() => setViewTab('dispatches')}
          className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 ${viewTab === 'dispatches' ? 'btn-dark text-white' : 'btn-outline-secondary'}`}
        >
          <Compass size={14} />
          <span>Active Dispatches &amp; Live Radar</span>
          <span className="badge bg-secondary ms-1">{dispatches.length}</span>
        </button>
        <button
          onClick={() => setViewTab('fleet_verification')}
          className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 ${viewTab === 'fleet_verification' ? 'btn-dark text-white' : 'btn-outline-secondary'}`}
        >
          <ShieldCheck size={14} className="text-warning" />
          <span>Fleet Document Verification &amp; Oversight</span>
          {fleetVehicles.filter(v => v.verification_status === 'PENDING_APPROVAL').length > 0 && (
            <span className="badge bg-warning text-dark ms-1">
              {fleetVehicles.filter(v => v.verification_status === 'PENDING_APPROVAL').length} Pending
            </span>
          )}
        </button>
      </div>

      {viewTab === 'fleet_verification' ? (
        /* FLEET VERIFICATION CONSOLE */
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold mb-0 text-dark">Fleet Vehicle Document Review &amp; Approval</h5>
              <p className="text-muted small mb-0">Verify Thai commercial registration, insurance, and transport permits before authorizing vehicles for guest transfers.</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm rounded-2"
                value={fleetStatusFilter}
                onChange={e => setFleetStatusFilter(e.target.value)}
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved &amp; Active</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <button onClick={loadFleetVehicles} className="btn btn-sm btn-outline-secondary rounded-2" title="Refresh Fleet">
                <RefreshCw size={13} className={fleetLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light border-bottom">
                  <tr style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                    <th className="ps-3 py-3">Vehicle Details</th>
                    <th className="py-3">Cab Vendor Partner</th>
                    <th className="py-3">Thai License Plate</th>
                    <th className="py-3">Capacity</th>
                    <th className="py-3">Submitted Documents</th>
                    <th className="py-3">Status</th>
                    <th className="pe-3 py-3 text-end">Verification Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.82rem' }}>
                  {fleetLoading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                        <div>Loading fleet verification queue...</div>
                      </td>
                    </tr>
                  ) : fleetVehicles.filter(v => fleetStatusFilter === 'ALL' || v.verification_status === fleetStatusFilter).length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No fleet vehicles match this filter.
                      </td>
                    </tr>
                  ) : (
                    fleetVehicles
                      .filter(v => fleetStatusFilter === 'ALL' || v.verification_status === fleetStatusFilter)
                      .map(veh => {
                        const isApproved = veh.verification_status === 'APPROVED';
                        const isPending = veh.verification_status === 'PENDING_APPROVAL';
                        const isRejected = veh.verification_status === 'REJECTED';

                        return (
                          <tr key={veh.id}>
                            <td className="ps-3">
                              <div className="d-flex align-items-center gap-2">
                                {veh.photo_url ? (
                                  <img src={veh.photo_url} alt="" className="rounded-2" style={{ width: '42px', height: '32px', objectFit: 'cover' }} />
                                ) : (
                                  <div className="rounded-2 bg-light d-flex align-items-center justify-content-center text-muted" style={{ width: '42px', height: '32px' }}>
                                    <Car size={16} />
                                  </div>
                                )}
                                <div>
                                  <strong className="d-block text-dark">{veh.brand} {veh.model}</strong>
                                  <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                                    {veh.category === 'VIP_VAN' ? 'VIP Van' : veh.category === 'SUV' ? 'Premium SUV' : 'Prime Sedan'} • {veh.color}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="fw-semibold text-dark">{veh.vendor_business_name || 'VIP Transfer Partner'}</span>
                              <span className="d-block text-muted small" style={{ fontSize: '0.7rem' }}>{veh.vendor_phone || ''}</span>
                            </td>
                            <td>
                              <span className="font-monospace fw-bold px-2 py-0.5 rounded bg-dark text-warning border" style={{ fontSize: '0.75rem' }}>
                                {veh.plate_number}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {veh.seating_capacity} Seats • {veh.luggage_capacity} Luggage
                              </span>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {veh.registration_doc_url ? (
                                  <a href={veh.registration_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-primary bg-opacity-10 text-primary text-decoration-none d-flex align-items-center gap-0.5">
                                    <FileText size={10} /> Reg Book <ExternalLink size={9} />
                                  </a>
                                ) : (
                                  <span className="badge bg-light text-muted">No Reg</span>
                                )}
                                {veh.insurance_doc_url ? (
                                  <a href={veh.insurance_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-success bg-opacity-10 text-success text-decoration-none d-flex align-items-center gap-0.5">
                                    <ShieldCheck size={10} /> Insurance <ExternalLink size={9} />
                                  </a>
                                ) : null}
                                {veh.permit_doc_url ? (
                                  <a href={veh.permit_doc_url} target="_blank" rel="noopener noreferrer" className="badge bg-warning bg-opacity-10 text-dark text-decoration-none d-flex align-items-center gap-0.5">
                                    <CheckCheck size={10} /> DLT Permit <ExternalLink size={9} />
                                  </a>
                                ) : null}
                              </div>
                            </td>
                            <td>
                              {isApproved && (
                                <span className="badge bg-success bg-opacity-15 text-success border border-success">
                                  Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="badge bg-warning bg-opacity-25 text-dark border border-warning">
                                  Pending Review
                                </span>
                              )}
                              {isRejected && (
                                <span className="badge bg-danger bg-opacity-15 text-danger border border-danger">
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="pe-3 text-end">
                              <div className="d-flex align-items-center justify-content-end gap-1.5">
                                {!isApproved && (
                                  <button
                                    onClick={() => handleApproveVehicle(veh.id)}
                                    disabled={actionLoading}
                                    className="btn btn-sm btn-success rounded-2 px-2.5 py-1 fw-semibold d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.74rem' }}
                                    title="Approve vehicle details and documents"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Approve</span>
                                  </button>
                                )}
                                {!isRejected && (
                                  <button
                                    onClick={() => handleRejectVehicle(veh.id)}
                                    disabled={actionLoading}
                                    className="btn btn-sm btn-outline-danger rounded-2 px-2.5 py-1 fw-semibold d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.74rem' }}
                                    title="Reject vehicle documents"
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
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
        </div>
      ) : (
        /* ACTIVE DISPATCHES CONSOLE */
        <>
      {/* Filters Bar */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '480px' }}>
          <div className="position-relative flex-grow-1">
            <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-2.5 text-muted" />
            <input
              type="text"
              className="form-control form-control-sm ps-5 rounded-3"
              placeholder="Search booking ref, route, passenger, driver..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="form-control form-control-sm rounded-3"
            style={{ width: '150px' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
              title="Clear date"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="d-flex align-items-center gap-1 flex-wrap">
          {['all', 'ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP', 'COMPLETED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold text-uppercase ${
                statusFilter === st ? 'btn-dark' : 'btn-light text-muted'
              }`}
              style={{ fontSize: '0.68rem' }}
            >
              {st === 'all' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Central Dispatches Table Card */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light border-bottom">
              <tr style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                <th className="ps-3 py-3">Transfer Booking</th>
                <th className="py-3">Schedule</th>
                <th className="py-3">Route (Origin → Destination)</th>
                <th className="py-3">Passenger</th>
                <th className="py-3">Assigned Driver &amp; Vehicle</th>
                <th className="py-3">Live GPS Telemetry</th>
                <th className="py-3">Fare</th>
                <th className="py-3">Status</th>
                <th className="pe-3 py-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.82rem' }}>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                    <div>Connecting to central dispatch feed...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <Car size={32} className="mb-2 text-muted opacity-50 d-inline-block" />
                    <div className="fw-bold">No transfers matching criteria</div>
                    <div className="small">Customer cab and airport transfers appear here in real-time.</div>
                  </td>
                </tr>
              ) : (
                filtered.map(dispatch => {
                  const status = (dispatch.ride_status || 'ALLOCATED').toUpperCase();
                  const isAllocated = status === 'ALLOCATED';
                  const isOnTrip = status === 'ON_TRIP';
                  const isCompleted = status === 'COMPLETED';
                  const isCancelled = status === 'CANCELLED';

                  let badgeColor = 'bg-warning text-dark';
                  if (status === 'DISPATCHED') badgeColor = 'bg-info text-dark';
                  if (status === 'ARRIVED') badgeColor = 'bg-primary text-white';
                  if (isOnTrip) badgeColor = 'bg-success text-white animate-pulse';
                  if (isCompleted) badgeColor = 'bg-success text-white';
                  if (isCancelled) badgeColor = 'bg-danger text-white';

                  const pickupTimeStr = dispatch.pickup_datetime
                    ? formatThaiPickupTime(dispatch.pickup_datetime)
                    : 'Scheduled';

                  const gpsCoords = dispatch.driver_current_location || null;

                  return (
                    <tr key={dispatch.id}>
                      <td className="ps-3 py-3">
                        <div className="fw-bold text-dark font-monospace" style={{ fontSize: '0.8rem' }}>
                          #{dispatch.booking_id || dispatch.id}
                        </div>
                        <span className="badge bg-light text-muted border px-1.5 py-0.5 mt-0.5" style={{ fontSize: '0.65rem' }}>
                          {dispatch.vehicle_category || 'SEDAN'}
                        </span>
                        <div className="text-muted mt-0.5" style={{ fontSize: '0.68rem' }}>
                          {groupSizeLabel(dispatch)}
                        </div>
                        {dispatch.vendor_id && (
                          <div className="text-muted" style={{ fontSize: '0.66rem' }}>
                            Vendor: {dispatch.vendor_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-1 text-dark small fw-semibold">
                          <Calendar size={13} className="text-muted" />
                          <span>
                            {pickupTimeStr}
                            {dispatch.pickup_datetime && <span className="text-muted fw-normal"> Thailand time</span>}
                          </span>
                        </div>
                        <span className="text-muted small" style={{ fontSize: '0.70rem' }}>
                          ~{dispatch.estimated_minutes || 30} mins ({dispatch.distance_km || 0} km)
                        </span>
                      </td>
                      <td className="py-3" style={{ maxWidth: '240px' }}>
                        <div className="small text-truncate fw-bold text-dark" title={dispatch.pickup_address}>
                          {dispatch.pickup_address}
                        </div>
                        <div className="small text-truncate text-muted d-flex align-items-center gap-1 mt-0.5" title={dispatch.dropoff_address}>
                          <ArrowRight size={11} className="text-warning flex-shrink-0" />
                          <span>{dispatch.dropoff_address}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold text-dark">{dispatch.customer_name || 'Guest'}</div>
                        <div className="text-muted small">{dispatch.customer_phone || 'N/A'}</div>
                      </td>
                      <td className="py-3">
                        {dispatch.driver_name ? (
                          <div>
                            <div className="fw-bold text-dark d-flex align-items-center gap-1">
                              <UserCheck size={13} className="text-success" />
                              <span>{dispatch.driver_name}</span>
                            </div>
                            <span className="badge bg-dark text-white font-monospace px-1.5 py-0.5 mt-0.5" style={{ fontSize: '0.68rem' }}>
                              {dispatch.driver_vehicle_plate || dispatch.vehicle_plate || 'Plate Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1 small">
                            Awaiting Allocation
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <DriverGpsCell
                          hasDriver={Boolean(dispatch.driver_id)}
                          rideEnded={isCompleted || isCancelled}
                          coords={gpsCoords}
                          receivedAt={dispatch.gpsReceivedAt}
                          onTrack={() => setTrackDispatchId(dispatch.id)}
                        />
                      </td>
                      <td className="py-3">
                        <div className="fw-bold text-dark font-heading">
                          ฿{Number(dispatch.total_fare_thb || dispatch.base_fare_thb || 0).toLocaleString()}
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                          {dispatch.payment_status === 'PAID' ? '✓ Paid' : 'Cash on Arrival'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`badge rounded-pill px-2.5 py-1 text-uppercase fw-bold ${badgeColor}`} style={{ fontSize: '0.68rem' }}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="pe-3 py-3 text-end">
                        {!isCompleted && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispatch(dispatch);
                              setAssignDriverId(dispatch.driver_id || '');
                              setShowAssignModal(true);
                            }}
                            className="btn btn-sm btn-outline-dark rounded-2 px-2.5 py-1 fw-bold"
                            style={{ fontSize: '0.72rem' }}
                          >
                            {dispatch.driver_id ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* REASSIGN DRIVER MODAL */}
      {showAssignModal && selectedDispatch && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-2 p-1.5 bg-primary bg-opacity-10 text-primary">
                  <Car size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark">Central Chauffeur Assignment</h6>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAssignModal(false)} 
                className="btn btn-sm btn-link text-muted p-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-3 bg-light border mb-3 small">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Booking Reference:</span>
                <strong className="text-dark">#{selectedDispatch.booking_id || selectedDispatch.id}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Passenger:</span>
                <span className="fw-bold">{selectedDispatch.customer_name} ({selectedDispatch.customer_phone})</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Pickup Location:</span>
                <span className="fw-bold text-truncate ms-2" style={{ maxWidth: '240px' }}>{selectedDispatch.pickup_address}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Destination:</span>
                <span className="fw-bold text-truncate ms-2" style={{ maxWidth: '240px' }}>{selectedDispatch.dropoff_address}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Group:</span>
                <span className="fw-bold">
                  {groupSizeLabel(selectedDispatch)} · {CATEGORY_LABEL[selectedDispatch.vehicle_category] || selectedDispatch.vehicle_category}
                </span>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="mb-4">
                <label className="form-label small fw-bold text-dark mb-1">
                  Select Certified Driver *
                </label>
                <select
                  required
                  className="form-select form-select-sm rounded-2 fw-semibold"
                  value={assignDriverId}
                  onChange={e => setAssignDriverId(e.target.value)}
                >
                  <option value="">-- Choose Approved Driver --</option>
                  {drivers.map(drv => {
                    const problem = driverFitProblem(drv, selectedDispatch);
                    return (
                      <option key={drv.id} value={drv.id} disabled={Boolean(problem)}>
                        {drv.full_name || drv.name} ({drv.vehicle_model || 'Sedan'} - {drv.vehicle_plate || drv.id}) [{(drv.status || 'Offline').toUpperCase()}]
                        {drv.vendor_id ? ` · ${drv.vendor_id}` : ''}
                        {problem ? ` — won't fit: ${problem}` : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="text-muted small mt-1">
                  Only drivers whose active vehicle fits this group can be selected. Assigning another vendor's driver moves the job to that vendor.
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-sm btn-light rounded-2 px-3 fw-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !assignDriverId}
                  className="btn btn-sm text-dark rounded-2 px-4 fw-bold"
                  style={{ background: 'linear-gradient(90deg,#F5C518,#E5A826)' }}
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      {showPricingModal && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-2 p-1.5 bg-dark bg-opacity-10 text-dark">
                  <Sliders size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark">Transfer Rate Card Rules</h6>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPricingModal(false)} 
                className="btn btn-sm btn-link text-muted p-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePricingSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-1">Vehicle Tier</label>
                <select
                  className="form-select form-select-sm rounded-2"
                  value={pricingTiers.tier_id}
                  onChange={e => {
                    const id = e.target.value;
                    let base = 300, perKm = 15, minF = 350;
                    if (id === 'tier-suv') { base = 500; perKm = 25; minF = 600; }
                    if (id === 'tier-vip-van') { base = 800; perKm = 35; minF = 1000; }
                    setPricingTiers({ tier_id: id, base_fare_thb: base, per_km_rate_thb: perKm, minimum_fare_thb: minF });
                  }}
                >
                  <option value="tier-sedan">Standard Executive Sedan (Toyota Camry)</option>
                  <option value="tier-suv">Premium Luxury SUV (Toyota Fortuner)</option>
                  <option value="tier-vip-van">VIP Commuter 9-Seater Van (Toyota Commuter)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-1">Base Fare (THB)</label>
                <input
                  type="number"
                  className="form-control form-control-sm rounded-2"
                  value={pricingTiers.base_fare_thb}
                  onChange={e => setPricingTiers({ ...pricingTiers, base_fare_thb: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-1">Per Kilometer Rate (THB)</label>
                <input
                  type="number"
                  className="form-control form-control-sm rounded-2"
                  value={pricingTiers.per_km_rate_thb}
                  onChange={e => setPricingTiers({ ...pricingTiers, per_km_rate_thb: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-dark mb-1">Minimum Fare (THB)</label>
                <input
                  type="number"
                  className="form-control form-control-sm rounded-2"
                  value={pricingTiers.minimum_fare_thb}
                  onChange={e => setPricingTiers({ ...pricingTiers, minimum_fare_thb: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="btn btn-sm btn-light rounded-2 px-3 fw-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-sm btn-dark rounded-2 px-4 fw-bold"
                >
                  {actionLoading ? 'Saving...' : 'Update Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trackedDispatch && (
        <DriverLiveMapModal dispatch={trackedDispatch} onClose={() => setTrackDispatchId(null)} />
      )}
    </div>
  );
}

