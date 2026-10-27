import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Building, QrCode, Upload, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import * as api from '../../../services/api';

export default function PMSPaymentSettings({ currentUser }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMethod, setNewMethod] = useState({
    method_type: 'PromptPay',
    details: { upi_id: '', name: '', qr_image: '', account_name: '', bank_name: 'Bangkok Bank (BBL)', account_number: '', ifsc: '', key_id: '', key_secret: '' }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const qrInputRef = useRef(null);

  const vendorId = currentUser?.id || 'vnd-phuket-01';

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await api.getVendorPaymentMethods(vendorId);
      setMethods(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('fetchMethods error:', e);
      setMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [vendorId]);

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setQrPreview(base64);
      setNewMethod(prev => ({
        ...prev,
        details: { ...prev.details, qr_image: base64 }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMethodTypeChange = (type) => {
    setQrPreview(null);
    setNewMethod({ 
      method_type: type, 
      details: { upi_id: '', name: '', qr_image: '', account_name: '', bank_name: 'Bangkok Bank (BBL)', account_number: '', ifsc: '', key_id: '', key_secret: '' } 
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload = {
        vendor_id: vendorId,
        method_type: newMethod.method_type,
        display_name: newMethod.method_type === 'PromptPay' ? 'PromptPay QR & Mobile' : (newMethod.method_type + ' Payment'),
        status: 'Active'
      };
      
      if (newMethod.method_type === 'PromptPay' || newMethod.method_type === 'UPI') {
        payload.upi_id = newMethod.details.upi_id;
        payload.account_name = newMethod.details.name;
        payload.qr_image_url = newMethod.details.qr_image;
      } else if (newMethod.method_type === 'Bank Transfer') {
        payload.account_name = newMethod.details.account_name;
        payload.bank_name = newMethod.details.bank_name;
        payload.account_number = newMethod.details.account_number;
        payload.ifsc_code = newMethod.details.ifsc;
      } else if (newMethod.method_type === 'Credit Card / Gateway' || newMethod.method_type === 'Razorpay') {
        payload.account_name = newMethod.details.key_id;
        payload.instructions = newMethod.details.key_secret;
      }

      await api.addVendorPaymentMethod(payload);
      setShowAdd(false);
      setQrPreview(null);
      setNewMethod({ 
        method_type: 'PromptPay', 
        details: { upi_id: '', name: '', qr_image: '', account_name: '', bank_name: 'Bangkok Bank (BBL)', account_number: '', ifsc: '', key_id: '', key_secret: '' } 
      });
      fetchMethods();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment method?")) return;
    try {
      await api.deleteVendorPaymentMethod(id);
      fetchMethods();
    } catch (e) {
      alert("Error deleting: " + e.message);
    }
  };

  const safeMethods = Array.isArray(methods) ? methods : [];

  return (
    <div className="p-4" style={{ minHeight: '100%' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1 font-heading" style={{ color: '#1a2b4a' }}>Thailand Payment Gateways</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Configure PromptPay, Thailand Bank Accounts, and Card Gateways for your bookings</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary fw-bold px-4 py-2 rounded-pill shadow-sm">
          <Plus size={18} className="me-2" /> Add Payment Method
        </button>
      </div>

      {showAdd && (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-4 font-heading">New Thailand Payment Method</h5>
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label text-muted fw-bold small">Method Type</label>
                <select
                  className="form-select rounded-3"
                  value={newMethod.method_type}
                  onChange={(e) => handleMethodTypeChange(e.target.value)}
                >
                  <option value="PromptPay">PromptPay QR &amp; Mobile ID (Thailand Standard)</option>
                  <option value="Bank Transfer">Thailand Bank Transfer (BBL / K-Bank / SCB)</option>
                  <option value="Credit Card / Gateway">Online Payment Gateway (Stripe / 2C2P / Omise)</option>
                </select>
              </div>

              {(newMethod.method_type === 'PromptPay' || newMethod.method_type === 'UPI') && (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-bold small">PromptPay Registered Name</label>
                      <input type="text" className="form-control rounded-3" placeholder="e.g. Andaman Phuket Tours Co., Ltd." value={newMethod.details.name}
                        onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, name: e.target.value } })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-bold small">PromptPay ID / Mobile / Tax ID</label>
                      <input type="text" className="form-control rounded-3" placeholder="e.g. 0812345678 or 0105561001234" value={newMethod.details.upi_id}
                        onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, upi_id: e.target.value } })} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold small">PromptPay QR Code Image (Optional)</label>
                    <div
                      className="border border-2 border-dashed rounded-3 p-3 text-center"
                      style={{ borderColor: '#dee2e6', cursor: 'pointer', background: '#f8f9fa' }}
                      onClick={() => qrInputRef.current?.click()}
                    >
                      {qrPreview ? (
                        <div className="position-relative d-inline-block">
                          <img src={qrPreview} alt="QR Preview" style={{ maxHeight: '160px', maxWidth: '160px', borderRadius: '8px' }} />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle p-1"
                            style={{ width: '24px', height: '24px', lineHeight: 1 }}
                            onClick={(e) => { e.stopPropagation(); setQrPreview(null); setNewMethod(prev => ({ ...prev, details: { ...prev.details, qr_image: '' } })); }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-muted py-2">
                          <QrCode size={36} className="mb-2 opacity-50" />
                          <div className="small fw-bold">Click to upload PromptPay QR Code image</div>
                        </div>
                      )}
                    </div>
                    <input ref={qrInputRef} type="file" accept="image/*" className="d-none" onChange={handleQrUpload} />
                  </div>
                </>
              )}

              {newMethod.method_type === 'Bank Transfer' && (
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">Account Holder Name</label>
                    <input type="text" className="form-control rounded-3" placeholder="Company or Individual Name" value={newMethod.details.account_name}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, account_name: e.target.value } })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">Thailand Bank Name</label>
                    <select
                      className="form-select rounded-3"
                      value={newMethod.details.bank_name}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, bank_name: e.target.value } })}
                    >
                      <option value="Bangkok Bank (BBL)">Bangkok Bank (BBL)</option>
                      <option value="Kasikornbank (K-Bank)">Kasikornbank (K-Bank)</option>
                      <option value="Siam Commercial Bank (SCB)">Siam Commercial Bank (SCB)</option>
                      <option value="Krungthai Bank (KTB)">Krungthai Bank (KTB)</option>
                      <option value="Bank of Ayudhya (Krungsri)">Bank of Ayudhya (Krungsri)</option>
                      <option value="TMBThanachart Bank (TTB)">TMBThanachart Bank (TTB)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">Account Number</label>
                    <input type="text" className="form-control rounded-3" placeholder="e.g. 123-4-56789-0" value={newMethod.details.account_number}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, account_number: e.target.value } })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">SWIFT / Branch Code (Optional)</label>
                    <input type="text" className="form-control rounded-3" placeholder="e.g. BKKTHBK" value={newMethod.details.ifsc}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, ifsc: e.target.value } })} />
                  </div>
                </div>
              )}

              {(newMethod.method_type === 'Credit Card / Gateway' || newMethod.method_type === 'Razorpay') && (
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">Public API Key / Client ID</label>
                    <input type="text" className="form-control rounded-3" placeholder="pk_live_..." value={newMethod.details.key_id}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, key_id: e.target.value } })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-bold small">Secret Key</label>
                    <input type="password" className="form-control rounded-3" placeholder="sk_live_..." value={newMethod.details.key_secret}
                      onChange={e => setNewMethod({ ...newMethod, details: { ...newMethod.details, key_secret: e.target.value } })} required />
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-light rounded-pill px-4">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary rounded-pill px-4 fw-bold">
                  {saving ? 'Saving...' : 'Save Payment Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>
      ) : safeMethods.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <Settings size={40} className="mx-auto text-muted mb-3 opacity-50" />
          <h5 className="fw-bold font-heading">No Payment Gateways Configured</h5>
          <p className="text-muted small">Customers will not be able to pay you directly until you add a PromptPay or Bank Transfer method.</p>
          <div>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary rounded-pill px-4 py-2 fw-bold">
              <Plus size={16} className="me-1" /> Add First Payment Method
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {safeMethods.map(method => {
            const isPromptPay = method.method_type === 'PromptPay' || method.method_type === 'UPI';
            const isBank = method.method_type === 'Bank Transfer';
            const isGateway = method.method_type === 'Credit Card / Gateway' || method.method_type === 'Razorpay';
            
            return (
              <div key={method.id} className="col-md-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className="badge bg-primary bg-opacity-10 text-primary mb-2 px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '11px' }}>
                          {isPromptPay ? '📱 PromptPay QR' : isBank ? '🏦 Thailand Bank' : '💳 Card Gateway'}
                        </span>
                        <h6 className="fw-bold m-0 font-heading" style={{ fontSize: '16px' }}>{method.display_name}</h6>
                      </div>
                      <span className={`badge rounded-pill px-2.5 py-1 ${method.status === 'Active' ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ fontSize: '11px' }}>
                        {method.status}
                      </span>
                    </div>

                    <div className="bg-light rounded-3 p-3 mb-3" style={{ fontSize: '13px' }}>
                      {isPromptPay && (
                        <>
                          <div className="small text-muted mb-0.5">PromptPay ID / Mobile</div>
                          <div className="fw-bold mb-2 font-monospace">{method.upi_id || '0812345678'}</div>
                          <div className="small text-muted mb-0.5">Registered Name</div>
                          <div className="fw-bold">{method.account_name}</div>
                        </>
                      )}
                      {isBank && (
                        <>
                          <div className="small text-muted mb-0.5">Bank</div>
                          <div className="fw-bold mb-2">{method.bank_name || 'Bangkok Bank (BBL)'}</div>
                          <div className="small text-muted mb-0.5">Account Number</div>
                          <div className="fw-bold mb-2 font-monospace">{method.account_number}</div>
                          {method.ifsc_code && (
                            <>
                              <div className="small text-muted mb-0.5">SWIFT / Branch</div>
                              <div className="fw-bold mb-2 font-monospace">{method.ifsc_code}</div>
                            </>
                          )}
                          <div className="small text-muted mb-0.5">Account Holder</div>
                          <div className="fw-bold">{method.account_name}</div>
                        </>
                      )}
                      {isGateway && (
                        <>
                          <div className="small text-muted mb-0.5">Client Key</div>
                          <div className="fw-bold text-truncate font-monospace">{method.account_name}</div>
                        </>
                      )}
                    </div>
                    
                    <button onClick={() => handleDelete(method.id)} className="btn btn-outline-danger btn-sm w-100 rounded-pill fw-bold">
                      Remove Method
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
