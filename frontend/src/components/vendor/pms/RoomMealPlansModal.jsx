import React, { useState, useEffect } from 'react';
import {
  Utensils, Coffee, Sun, Moon, Check, X, Plus, AlertCircle,
  CheckCircle2, DollarSign, Shield, Info, RefreshCw
} from 'lucide-react';
import { apiFetch, API_BASE } from '../../../services/api';

const DEFAULT_PLANS_TEMPLATE = [
  {
    meal_plan: 'EP',
    name: 'Room Only (EP)',
    description: 'Room stay without meals included',
    is_active: 1,
    base_price: 0,
    weekend_price: 0,
    extra_adult_rate: 600,
    extra_child_rate: 300,
    cancellation_policy: 'Free cancellation till 24h before check-in',
    inclusions: ['Room Stay Only', 'Free Wi-Fi']
  },
  {
    meal_plan: 'CP',
    name: 'Breakfast Included (CP)',
    description: 'Daily buffet or continental breakfast included',
    is_active: 1,
    base_price: 450, // default supplement above base
    weekend_price: 520,
    extra_adult_rate: 850,
    extra_child_rate: 450,
    cancellation_policy: 'Free cancellation till 24h before check-in',
    inclusions: ['Daily Buffet Breakfast', 'Room Stay', 'Free Wi-Fi']
  },
  {
    meal_plan: 'MAP',
    name: 'Breakfast + Dinner (MAP)',
    description: 'Daily breakfast and multi-cuisine dinner buffet',
    is_active: 1,
    base_price: 1300,
    weekend_price: 1500,
    extra_adult_rate: 1200,
    extra_child_rate: 650,
    cancellation_policy: 'Free cancellation till 48h before check-in',
    inclusions: ['Daily Buffet Breakfast', 'Dinner Buffet', 'Free Wi-Fi']
  },
  {
    meal_plan: 'AP',
    name: 'All Meals Included (AP)',
    description: 'Breakfast, lunch, dinner and evening tea/coffee',
    is_active: 1,
    base_price: 2000,
    weekend_price: 2300,
    extra_adult_rate: 1500,
    extra_child_rate: 800,
    cancellation_policy: 'Free cancellation till 48h before check-in',
    inclusions: ['All Meals Included', 'Free Wi-Fi', 'Evening Tea']
  }
];

export default function RoomMealPlansModal({
  hotelId,
  roomType,
  roomBasePrice = 0,
  onClose,
  onSaved
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState('CP');
  const [inclusionInput, setInclusionInput] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlertMsg({ message, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token } : {};
      const res = await apiFetch(`${API_BASE}?resource=pms_get_room_meal_plans&hotel_id=${encodeURIComponent(hotelId)}&room_type_id=${encodeURIComponent(roomType.id)}`, { headers });
      const data = await res.json();

      const existingPlans = (data.success && Array.isArray(data.rate_plans) && data.rate_plans.length > 0)
        ? data.rate_plans
        : [];

      // Merge existing plans with default template
      const baseRoomRate = parseFloat(roomBasePrice || roomType.base_price || roomType.selling_price || 3000);

      const merged = DEFAULT_PLANS_TEMPLATE.map(def => {
        const found = existingPlans.find(p => p.meal_plan === def.meal_plan);
        if (found) {
          let parsedInc = found.inclusions;
          if (typeof parsedInc === 'string') {
            try { parsedInc = JSON.parse(parsedInc); } catch (e) { parsedInc = def.inclusions; }
          }
          return {
            ...def,
            ...found,
            base_price: parseFloat(found.base_price || 0),
            weekend_price: parseFloat(found.weekend_price || 0),
            extra_adult_rate: parseFloat(found.extra_adult_rate || def.extra_adult_rate),
            extra_child_rate: parseFloat(found.extra_child_rate || def.extra_child_rate),
            is_active: found.is_active !== undefined ? parseInt(found.is_active, 10) : 1,
            inclusions: Array.isArray(parsedInc) ? parsedInc : def.inclusions
          };
        }

        // Calculate absolute rate starting from baseRoomRate
        const initialAbsRate = def.meal_plan === 'EP' ? baseRoomRate : (baseRoomRate + def.base_price);
        return {
          ...def,
          base_price: initialAbsRate,
          weekend_price: Math.round(initialAbsRate * 1.15)
        };
      });

      setPlans(merged);
    } catch (err) {
      console.error('Failed to load meal rate plans:', err);
      showAlert('Failed to load meal plans from server.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [hotelId, roomType.id]);

  const updateCurrentPlan = (key, value) => {
    setPlans(prev => prev.map(p => {
      if (p.meal_plan === activePlanTab) {
        return { ...p, [key]: value };
      }
      return p;
    }));
  };

  const handleAddInclusion = () => {
    const trimmed = inclusionInput.trim();
    if (!trimmed) return;
    setPlans(prev => prev.map(p => {
      if (p.meal_plan === activePlanTab) {
        const existing = Array.isArray(p.inclusions) ? p.inclusions : [];
        if (!existing.includes(trimmed)) {
          return { ...p, inclusions: [...existing, trimmed] };
        }
      }
      return p;
    }));
    setInclusionInput('');
  };

  const handleRemoveInclusion = (incItem) => {
    setPlans(prev => prev.map(p => {
      if (p.meal_plan === activePlanTab) {
        return { ...p, inclusions: (p.inclusions || []).filter(i => i !== incItem) };
      }
      return p;
    }));
  };

  const handleSaveAllPlans = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
      const payload = {
        action: 'pms_save_room_meal_plans',
        auth_token: token,
        hotel_id: hotelId,
        room_type_id: roomType.id,
        rate_plans: plans.map(p => ({
          meal_plan: p.meal_plan,
          name: p.name,
          base_price: parseFloat(p.base_price || 0),
          weekend_price: parseFloat(p.weekend_price || p.base_price || 0),
          extra_adult_rate: parseFloat(p.extra_adult_rate || 0),
          extra_child_rate: parseFloat(p.extra_child_rate || 0),
          cancellation_policy: p.cancellation_policy || 'Free cancellation till 24h before check-in',
          inclusions: p.inclusions || [],
          is_active: p.is_active ? 1 : 0
        }))
      };

      const res = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Meal plans synchronized successfully without duplicates!');
        if (onSaved) onSaved(data);
        setTimeout(() => onClose(), 1200);
      } else {
        alert(data.error || 'Failed to synchronize meal plans');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentPlan = plans.find(p => p.meal_plan === activePlanTab) || plans[0] || DEFAULT_PLANS_TEMPLATE[0];

  return (
    <div
      className="position-fixed inset-0 top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
      style={{ background: 'rgba(13,27,46,0.7)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column"
        style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', margin: '0 16px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 d-flex align-items-center justify-content-between text-white" style={{ background: '#0D1B2E' }}>
          <div>
            <div className="d-flex align-items-center gap-2">
              <Utensils size={18} className="text-warning" />
              <h6 className="fw-bold mb-0">Room Meal Plans & Rate Options</h6>
            </div>
            <span className="text-white-50 small">
              Room: <strong>{roomType.name}</strong> • Synchronize EP, CP, MAP, AP pricing
            </span>
          </div>
          <button className="btn btn-sm text-white-50 p-0 border-0" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {alertMsg && (
          <div className={`alert alert-${alertMsg.type} m-3 mb-0 py-2 px-3 small d-flex align-items-center gap-2`}>
            {alertMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{alertMsg.message}</span>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="p-5 text-center">
            <RefreshCw size={32} className="spin text-primary mb-2" />
            <div className="text-muted small">Loading meal rate plans...</div>
          </div>
        ) : (
          <div className="p-4 overflow-auto flex-grow-1 d-flex flex-column gap-3">
            {/* Meal Plan Select Tabs */}
            <div className="d-flex flex-wrap gap-2 p-1.5 rounded-3 bg-light border">
              {plans.map(p => {
                const isSelected = p.meal_plan === activePlanTab;
                return (
                  <button
                    key={p.meal_plan}
                    type="button"
                    className={`btn btn-sm rounded-pill flex-grow-1 px-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 border transition-all ${
                      isSelected
                        ? 'btn-dark text-white border-dark shadow-sm'
                        : 'btn-white text-muted bg-white border-secondary border-opacity-20'
                    }`}
                    style={{ fontSize: '0.82rem' }}
                    onClick={() => setActivePlanTab(p.meal_plan)}
                  >
                    <span>{p.meal_plan}</span>
                    <span className="fw-normal" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ฿{parseFloat(p.base_price || 0).toLocaleString('en-IN')}
                    </span>
                    {p.is_active === 0 && (
                      <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem' }}>Off</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Plan Configuration Card */}
            <div className="card border rounded-4 p-3.5 shadow-sm bg-white">
              <div className="d-flex align-items-center justify-content-between border-bottom pb-2.5 mb-3">
                <div>
                  <h6 className="fw-bold text-dark mb-0">{currentPlan.name}</h6>
                  <span className="text-muted small">{currentPlan.description}</span>
                </div>

                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`active_${currentPlan.meal_plan}`}
                    checked={currentPlan.is_active === 1}
                    onChange={e => updateCurrentPlan('is_active', e.target.checked ? 1 : 0)}
                  />
                  <label className="form-check-label fw-bold small text-dark" htmlFor={`active_${currentPlan.meal_plan}`}>
                    Plan Enabled
                  </label>
                </div>
              </div>

              {/* Pricing row */}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Standard Nightly Rate (฿) *</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light fw-bold">฿</span>
                    <input
                      type="number"
                      className="form-control"
                      value={currentPlan.base_price ?? ''}
                      onChange={e => updateCurrentPlan('base_price', e.target.value)}
                      placeholder="e.g. 5450"
                      min="0"
                      required
                    />
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Final price charged to guest per night for this room + {currentPlan.meal_plan}
                  </span>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Weekend Rate (฿)</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light fw-bold">฿</span>
                    <input
                      type="number"
                      className="form-control"
                      value={currentPlan.weekend_price ?? ''}
                      onChange={e => updateCurrentPlan('weekend_price', e.target.value)}
                      placeholder="e.g. 6200"
                      min="0"
                    />
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Friday and Saturday nightly rate
                  </span>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Extra Adult Supplement (฿)</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light fw-bold">฿</span>
                    <input
                      type="number"
                      className="form-control"
                      value={currentPlan.extra_adult_rate ?? ''}
                      onChange={e => updateCurrentPlan('extra_adult_rate', e.target.value)}
                      placeholder="e.g. 850"
                      min="0"
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold text-muted small">Extra Child Supplement (฿)</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light fw-bold">฿</span>
                    <input
                      type="number"
                      className="form-control"
                      value={currentPlan.extra_child_rate ?? ''}
                      onChange={e => updateCurrentPlan('extra_child_rate', e.target.value)}
                      placeholder="e.g. 450"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="mb-3">
                <label className="form-label fw-bold text-muted small">Cancellation Policy for this Rate</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={currentPlan.cancellation_policy || ''}
                  onChange={e => updateCurrentPlan('cancellation_policy', e.target.value)}
                  placeholder="e.g. Free cancellation till 24h before check-in"
                />
              </div>

              {/* Inclusions Chips */}
              <div>
                <label className="form-label fw-bold text-muted small mb-1">Included in this Plan</label>
                <div className="d-flex flex-wrap gap-1.5 mb-2">
                  {(currentPlan.inclusions || []).map(inc => (
                    <span
                      key={inc}
                      className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill d-flex align-items-center gap-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Check size={11} className="text-success" />
                      <span>{inc}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-muted p-0 ms-1"
                        onClick={() => handleRemoveInclusion(inc)}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="input-group input-group-sm" style={{ maxWidth: '360px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add custom inclusion (e.g. Free Airport Pickup)..."
                    value={inclusionInput}
                    onChange={e => setInclusionInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleAddInclusion}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Note on MakeMyTrip Synchronization */}
            <div className="p-3 rounded-3 border bg-light small text-muted d-flex align-items-start gap-2">
              <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <div>
                <strong>Atomic Rate Plan Synchronization:</strong> Saving meal plans updates both the authoritative{' '}
                <code>hotel_rate_plans</code> database table and the <code>meal_options_json</code> cache. Customers will see your exact configured supplements on the hotel booking page.
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 px-4 border-top d-flex align-items-center justify-content-between bg-white flex-shrink-0">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary px-4 rounded-pill"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-sm text-white px-5 rounded-pill fw-bold"
            style={{ background: 'linear-gradient(90deg, #FF6333, #FF8A00)' }}
            onClick={handleSaveAllPlans}
            disabled={saving || loading}
          >
            {saving ? 'Synchronizing Plans...' : 'Save & Synchronize All Meal Plans'}
          </button>
        </div>
      </div>
    </div>
  );
}
