import React, { useState, useEffect } from 'react';
import {
  Compass, Calendar, Clock, MapPin, Car, User, Phone, Check,
  AlertCircle, Search, RefreshCw, Loader2, ArrowRight, ShieldCheck,
  Send, UserCheck, AlertTriangle
} from 'lucide-react';
import {
  fetchCabDispatches,
  assignCabDriver,
  fetchVendorDrivers
} from '../../../services/api';

export default function VendorTransferDispatches({ currentUser }) {
  const [dispatches, setDispatches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Assign Driver Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [dispRes, drvRes] = await Promise.all([
        fetchCabDispatches(),
        fetchVendorDrivers()
      ]);

      if (dispRes && dispRes.success && Array.isArray(dispRes.data)) {
        setDispatches(dispRes.data);
      } else {
        setDispatches([]);
      }

      if (drvRes && drvRes.success && Array.isArray(drvRes.data)) {
        setDrivers(drvRes.data);
      } else {
        setDrivers([]);
      }
    } catch (err) {
      console.error('Failed to load vendor transfer dispatches:', err);
      setErrorMsg('Unable to retrieve transfer dispatches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDispatch || !assignDriverId) {
      setErrorMsg('Please select a chauffeur to assign.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await assignCabDriver(selectedDispatch.id, assignDriverId);
      if (res && res.success) {
        setSuccessMsg(`Chauffeur successfully assigned to transfer #${selectedDispatch.id}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowAssignModal(false);
        setSelectedDispatch(null);
        setAssignDriverId('');
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to assign chauffeur.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error executing chauffeur assignment.');
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

  const totalDuties = dispatches.length;
  const onTripCount = dispatches.filter(d => d.ride_status === 'ON_TRIP').length;
  const allocatedCount = dispatches.filter(d => d.ride_status === 'ALLOCATED').length;
  const completedCount = dispatches.filter(d => d.ride_status === 'COMPLETED').length;

  return (
    <div className="p-4" style={{ height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#0D1B2E' }}>Transfer Dispatch Feed</h4>
          <p className="text-muted mb-0 small">
            Monitor incoming customer cab &amp; airport transfer requests assigned to your vendor account, assign chauffeurs, and track live duty progress.
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn btn-sm btn-outline-secondary rounded-3 d-flex align-items-center gap-1.5"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Dispatches</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Total Transfer Duties</span>
            <div className="fs-4 fw-black text-dark font-heading mt-1">{totalDuties}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>All-time bookings assigned</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Pending Chauffeur</span>
            <div className="fs-4 fw-black text-warning font-heading mt-1">{allocatedCount}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Awaiting driver assignment</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Live On Trip</span>
            <div className="fs-4 fw-black text-primary font-heading mt-1">{onTripCount}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Passengers in transit</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="p-3 rounded-3 border bg-white shadow-xs">
            <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Completed Transfers</span>
            <div className="fs-4 fw-black text-success font-heading mt-1">{completedCount}</div>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Successfully executed</span>
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
        <div className="position-relative" style={{ maxWidth: '340px', width: '100%' }}>
          <Search size={15} className="position-absolute top-50 start-0 translate-middle-y ms-2.5 text-muted" />
          <input
            type="text"
            className="form-control form-control-sm ps-5 rounded-3"
            placeholder="Search booking ref, route, passenger, driver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          {['all', 'ALLOCATED', 'DISPATCHED', 'ARRIVED', 'ON_TRIP', 'COMPLETED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm rounded-pill px-3 py-1 fw-bold text-uppercase ${
                statusFilter === st ? 'btn-dark' : 'btn-light text-muted'
              }`}
              style={{ fontSize: '0.68rem' }}
            >
              {st === 'all' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatches Table Card */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light border-bottom">
              <tr style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                <th className="ps-3 py-3">Transfer Booking</th>
                <th className="py-3">Schedule</th>
                <th className="py-3">Route (Origin → Destination)</th>
                <th className="py-3">Passenger</th>
                <th className="py-3">Assigned Chauffeur</th>
                <th className="py-3">Fare (THB)</th>
                <th className="py-3">Status</th>
                <th className="pe-3 py-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.82rem' }}>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <Loader2 size={24} className="animate-spin mb-2 d-inline-block text-primary" />
                    <div>Loading transfer dispatches...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <Compass size={32} className="mb-2 text-muted opacity-50 d-inline-block" />
                    <div className="fw-bold">No transfer dispatches found</div>
                    <div className="small">Customer bookings assigned to your fleet will appear in this live feed.</div>
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
                    ? new Date(dispatch.pickup_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Scheduled';

                  return (
                    <tr key={dispatch.id}>
                      <td className="ps-3 py-3">
                        <div className="fw-bold text-dark font-monospace" style={{ fontSize: '0.8rem' }}>
                          #{dispatch.booking_id || dispatch.id}
                        </div>
                        <span className="badge bg-light text-muted border px-1.5 py-0.5 mt-0.5" style={{ fontSize: '0.65rem' }}>
                          {dispatch.vehicle_category || 'SEDAN'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-1 text-dark small fw-semibold">
                          <Calendar size={13} className="text-muted" />
                          <span>{pickupTimeStr}</span>
                        </div>
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
                        <div className="fw-semibold text-dark">{dispatch.customer_name || 'VIP Guest'}</div>
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
                              {dispatch.driver_vehicle_plate || dispatch.vehicle_plate || 'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1 small">
                            Unassigned
                          </span>
                        )}
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
                            {dispatch.driver_id ? 'Reassign' : 'Assign Chauffeur'}
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

      {/* ASSIGN CHAUFFEUR MODAL */}
      {showAssignModal && selectedDispatch && (
        <div 
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3 z-3"
          style={{ backgroundColor: 'rgba(13,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
          <div className="card border-0 rounded-4 shadow-2xl p-4 bg-white" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-2 p-1.5 bg-primary bg-opacity-10 text-primary">
                  <Car size={18} />
                </div>
                <h6 className="fw-bold mb-0 text-dark">Assign Chauffeur to Transfer</h6>
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
              <div className="d-flex justify-content-between">
                <span className="text-muted">Destination:</span>
                <span className="fw-bold text-truncate ms-2" style={{ maxWidth: '240px' }}>{selectedDispatch.dropoff_address}</span>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="mb-4">
                <label className="form-label small fw-bold text-dark mb-1">
                  Select Certified Fleet Chauffeur *
                </label>
                <select
                  required
                  className="form-select form-select-sm rounded-2 fw-semibold"
                  value={assignDriverId}
                  onChange={e => setAssignDriverId(e.target.value)}
                >
                  <option value="">-- Choose Chauffeur --</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>
                      {drv.full_name} ({drv.vehicle_model} - {drv.vehicle_plate}) [{(drv.status || 'Offline').toUpperCase()}]
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <div className="text-danger small mt-1">
                    No chauffeurs found. Please register chauffeurs in Chauffeur Roster first.
                  </div>
                )}
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
                  className="btn btn-sm text-white rounded-2 px-4 fw-bold"
                  style={{ background: 'linear-gradient(90deg,#FF6333,#FF8A00)' }}
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

