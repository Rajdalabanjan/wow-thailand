import React, { useState, useEffect } from 'react';
import { fetchBookingById } from '../../services/api';
import BookingVoucher from '../../components/common/BookingVoucher';
import { FileText, ArrowLeft, Search, AlertCircle, Loader2 } from 'lucide-react';

/**
 * DirectVoucherPage — Instant Official Booking Voucher View
 * 
 * Accessible via `/voucher?id=TH-BKG-XXXX`
 * - Direct access from Email attachment links, SMS, or WhatsApp
 * - ZERO customer portal redirects
 * - ZERO OTP or phone authentication requirements
 * - Direct print / PDF generation and full booking breakdown
 */
export default function DirectVoucherPage({ onBackHome }) {
  const [bookingId, setBookingId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('pnr') || params.get('booking_id') || '';
  });

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  const loadBooking = async (idToFetch) => {
    if (!idToFetch) {
      // Check if there is a recently created booking in storage
      try {
        const last = JSON.parse(localStorage.getItem('last_created_booking') || 'null');
        if (last && (last.id || last.booking_id)) {
          setBooking(last);
          setLoading(false);
          return;
        }
      } catch (e) {}
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingById(idToFetch);
      if (data) {
        setBooking(data);
      } else {
        // Fallback: check localStorage
        const local = JSON.parse(localStorage.getItem('local_bookings') || '[]');
        const match = local.find(b => String(b.id) === idToFetch || String(b.booking_id) === idToFetch);
        if (match) {
          setBooking(match);
        } else {
          setError(`No confirmed booking found for reference "${idToFetch}".`);
        }
      }
    } catch (err) {
      console.error('[DirectVoucherPage] Error fetching voucher:', err);
      setError('Unable to load booking voucher at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking(bookingId);
  }, [bookingId]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    const clean = searchInput.trim().replace(/^#/, '');
    if (clean) {
      window.history.replaceState(null, '', `/voucher?id=${encodeURIComponent(clean)}`);
      setBookingId(clean);
    }
  };

  const handleClose = () => {
    if (onBackHome) {
      onBackHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#070f1e', color: '#f8fafc' }}>
      {/* Top Banner Navigation */}
      <div 
        className="no-print d-flex align-items-center justify-content-between px-3 px-md-4 py-3 border-bottom"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#0b162c' }}
      >
        <div className="d-flex align-items-center gap-3">
          <button 
            type="button" 
            onClick={handleClose}
            className="btn btn-outline-light btn-sm rounded-pill d-flex align-items-center gap-1.5 px-3 py-1.5"
            style={{ fontSize: '12px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill px-2.5 py-1 text-dark fw-bold" style={{ background: '#ff9f1c', fontSize: '11px' }}>
              OFFICIAL VOUCHER
            </span>
            <span className="fw-bold text-white small d-none d-sm-inline">
              WOW THAILAND Direct Travel Confirmation
            </span>
          </div>
        </div>

        {bookingId && (
          <div className="text-secondary small font-monospace">
            Ref: <strong className="text-warning">#{bookingId}</strong>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="container py-4">
        {loading && (
          <div className="text-center py-5">
            <Loader2 size={36} className="text-warning animate-spin mb-3 mx-auto" />
            <h5 className="text-white fw-bold">Loading Official Booking Voucher...</h5>
            <p className="text-muted small">Retrieving verified reservation and schedule details</p>
          </div>
        )}

        {!loading && error && (
          <div className="card bg-dark border-secondary mx-auto shadow-lg p-4" style={{ maxWidth: '480px' }}>
            <div className="text-center mb-3">
              <AlertCircle size={40} className="text-warning mb-2" />
              <h5 className="text-white fw-bold">Voucher Not Located</h5>
              <p className="text-muted small mb-0">{error}</p>
            </div>

            <form onSubmit={handleManualSearch} className="mb-3">
              <label className="form-label text-secondary small fw-bold">Enter Booking Reference or PNR:</label>
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control bg-black text-white border-secondary"
                  placeholder="e.g. TH-BKG-20261030-5893"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-warning fw-bold d-flex align-items-center gap-1">
                  <Search size={15} /> Find
                </button>
              </div>
            </form>

            <div className="text-center">
              <button 
                type="button" 
                onClick={handleClose}
                className="btn btn-link text-secondary text-decoration-none small"
              >
                ← Return to WOW THAILAND Home
              </button>
            </div>
          </div>
        )}

        {!loading && !error && booking && (
          <BookingVoucher 
            booking={booking} 
            onClose={handleClose} 
            isModal={true} 
          />
        )}
      </div>
    </div>
  );
}

