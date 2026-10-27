import React, { useState } from 'react';
import { 
  Compass, MapPin, Phone, Mail, Clock, ShieldCheck, 
  Car, Bike, Building2, Package, Sparkles, Navigation, 
  CreditCard, CheckCircle2, HelpCircle, ExternalLink, 
  X, FileText, ChevronRight, MessageSquare
} from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';

export default function Footer({ setActiveTab }) {
  const { liveConfig } = useSiteConfig();
  const [activeInfoModal, setActiveInfoModal] = useState(null);

  const phone = liveConfig?.phone || '+66 2 123 4567';
  const cleanPhone = phone.replace(/\D/g, '');
  const email = liveConfig?.email || 'support@wowthailand.com';
  const address = liveConfig?.address || 'Sukhumvit - Patong Main Road, Bangkok & Pattaya, 403516';
  const whatsappUrl = `https://wa.me/${cleanPhone || '6621234567'}?text=${encodeURIComponent('Hi WOW THAILAND, I would like to inquire about vehicle rentals and holiday bookings in Thailand.')}`;

  // Policies data for interactive modal
  const infoModalsData = {
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How WOW THAILAND protects your personal information',
      content: (
        <div>
          <p className="text-secondary small">WOW THAILAND is committed to safeguarding customer personal and booking data in strict adherence to data protection standards.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">1. Information We Collect</h6>
          <p className="text-muted small">We collect your name, phone number, email address, passport / national ID for hotel reservations, and booking preferences to facilitate reservations.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">2. Secure Document Verification</h6>
          <p className="text-muted small">Identity documents provided for reservations are encrypted and used solely for lawful hospitality bookings and Thailand Ministry of Tourism compliance.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">3. Payment Information Security</h6>
          <p className="text-muted small">All payments are processed via PCI-DSS compliant secure payment gateways (PromptPay, Thai QR, Visa, Mastercard). We never store raw card numbers or UPI PINs.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">4. Zero Spam Promise</h6>
          <p className="text-muted small">Your contact details are never shared with third-party telemarketers. You will only receive critical booking updates and vouchers.</p>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      subtitle: 'General rental guidelines and reservation rules',
      content: (
        <div>
          <h6 className="fw-bold mt-2 mb-1 text-dark">1. Chauffeur-Driven Transfers & Identity</h6><p className="text-muted small">All vehicle transfers are 100% chauffeur-driven by licensed local Thai drivers. Guests only require a valid passport or government ID matching their voucher name.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">2. Vehicle Handover & Inspection</h6>
          <p className="text-muted small">Both host and customer perform a physical video and checklist inspection of vehicle condition, fuel level, and odometer reading before sign-off.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">3. Speed Limits & Traffic Laws</h6>
          <p className="text-muted small">Drivers must adhere to Thailand Tourist Police regulations, seatbelt/helmet mandates, and state speed limits (typically 70 km/h on highways). Fines incurred during the rental period are the customer's responsibility.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">4. Fuel Policy</h6>
          <p className="text-muted small">Vehicles are typically provided with equal-level fuel policy (return with the same fuel level as handed over). Fuel stations are readily available across North and Phuket & Krabi.</p>
        </div>
      )
    },
    cancellation: {
      title: 'Cancellation & Refund Policy',
      subtitle: 'Transparent, customer-friendly cancellation guarantees',
      content: (
        <div>
          <div className="p-3 bg-light rounded-3 mb-3 border">
            <div className="d-flex align-items-center gap-2 mb-1">
              <ShieldCheck className="text-success" size={20} />
              <strong className="text-dark small">Guaranteed Direct Host Refunds</strong>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
              We understand plans can change. Cancellations made well in advance qualify for immediate refunds as per the vendor's policy tier.
            </p>
          </div>
          <h6 className="fw-bold mt-2 mb-1 text-dark">Standard Cancellation Schedule</h6>
          <ul className="text-muted small ps-3 mb-3">
            <li className="mb-1"><strong>More than 24 hours before pickup:</strong> 90% - 100% refund (as per vendor policy).</li>
            <li className="mb-1"><strong>12 to 24 hours before pickup:</strong> 50% refund on advance booking amount.</li>
            <li className="mb-1"><strong>Less than 12 hours / No-Show:</strong> Non-refundable to protect host reservation slot.</li>
          </ul>
          <h6 className="fw-bold mt-2 mb-1 text-dark">Refund Processing Time</h6>
          <p className="text-muted small">Approved refunds are processed instantly and credited back to your original source account (UPI / Bank) within 24 to 48 banking hours.</p>
        </div>
      )
    },
    deposit: {
      title: 'Chauffeur & Transfer Policy',
      subtitle: 'Professional drivers, zero deposit & flight tracking',
      content: (
        <div>
          <h6 className="fw-bold mt-2 mb-1 text-dark">1. Zero Security Deposit</h6>
          <p className="text-muted small">Since all transfers are conducted by professional licensed chauffeurs, no vehicle security deposit or credit card pre-authorization is ever required.</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">2. Airport Meet & Greet Included</h6>
          <p className="text-muted small">Your driver greets you at the arrival hall with a personalized name card at Suvarnabhumi (BKK), Don Mueang (DMK), or Phuket (HKT).</p>
          <h6 className="fw-bold mt-3 mb-1 text-dark">3. Flight Delay Guarantee</h6>
          <p className="text-muted small">We automatically monitor your flight status. If your arrival is delayed, your pickup time is adjusted without extra waiting fees.</p>
        </div>
      )
    },
    faqs: {
      title: 'Frequently Asked Questions',
      subtitle: 'Quick answers for hassle-free Thailand exploration',
      content: (
        <div className="accordion accordion-flush" id="footerFaqAccordion">
          <div className="mb-2">
            <strong className="d-block text-dark small mb-1">Q: Can I get delivery directly at Don Mueang or Suvarnabhumi Airport (BKK)?</strong>
            <p className="text-muted small">Yes! Most partner hosts provide doorstep delivery directly at Don Mueang Airport (DMK) and Suvarnabhumi Airport (BKK) with meet &amp; greet assistance.</p>
          </div>
          <div className="mb-2">
            <strong className="d-block text-dark small mb-1">Q: Are there any hidden fees or extra kilometer charges?</strong>
            <p className="text-muted small">No! All verified listings display transparent per-day rates with unlimited or specified daily kilometer allowances clearly shown before booking.</p>
          </div>
            <div className="mb-2">
              <strong className="d-block text-dark small mb-1">Q: How do I track or modify my confirmed booking?</strong>
              <p className="text-muted small">You can track your booking anytime using your Booking ID and mobile number via the "My Bookings" link in the top menu or directly with our 24/7 support team.</p>
            </div>
        </div>
      )
    }
  };

  const handleNavClick = (e, tabId) => {
    e.preventDefault();
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
    const pathMap = {
      'cars': '/cars',
      'hotels': '/hotels',
      'activities': '/activities',
      'customer': '/customer',
      'b2b': '/b2b',
      'portal': '/portal'
    };
    const target = pathMap[tabId] || `/${tabId}`;
    try {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="premium-footer" style={{ background: '#07101D', color: '#CBD5E1', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="container py-5">
          {/* 5-Column Detailed Info Grid */}
          <div className="row g-4 text-start">
            {/* Col 1: Brand & Highlights */}
            <div className="col-lg-3 col-md-6">
              <a 
                className="d-flex align-items-center text-decoration-none mb-3" 
                href="/" 
                onClick={(e) => handleNavClick(e, 'cars')}
              >
                <div className="rounded-circle p-2 bg-warning text-dark me-2 d-flex align-items-center justify-content-center shadow-xs" style={{ width: '38px', height: '38px' }}>
                  <Compass size={22} />
                </div>
                <div>
                  <span className="text-white fw-black fs-5 line-height-1 d-block font-heading">WOW THAILAND</span>
                  <span className="text-warning text-uppercase fw-bold text-xxs" style={{ letterSpacing: '1px' }}>Thailand Hotels & Airport Transfers &amp; Stays</span>
                </div>
              </a>
              <p className="small text-muted mb-3" style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
                WOW THAILAND is Thailand’s premier travel platform. Verified beachfront hotels, chauffeur-driven airport cabs & transfers, and island sightseeing tours.
              </p>
              <div className="d-flex flex-column gap-1.5 mb-3 text-xxs text-light">
                <span className="d-flex align-items-center gap-1.5 text-muted">
                  <ShieldCheck size={14} className="text-success" /> 100% Licensed Drivers &amp; Modern Fleet
                </span>
                <span className="d-flex align-items-center gap-1.5 text-muted">
                  <Clock size={14} className="text-warning" /> 24/7 Roadside Assistance
                </span>
                <span className="d-flex align-items-center gap-1.5 text-muted">
                  <CheckCircle2 size={14} className="text-info" /> Zero Security Deposit &amp; Tolls Included
                </span>
              </div>
              <div className="d-flex gap-2">
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="btn btn-sm btn-dark rounded-circle p-2 text-white border-secondary">
                  <i className="bi bi-facebook fs-6"></i>
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="btn btn-sm btn-dark rounded-circle p-2 text-white border-secondary">
                  <i className="bi bi-instagram fs-6"></i>
                </a>
                <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="btn btn-sm btn-dark rounded-circle p-2 text-white border-secondary">
                  <i className="bi bi-youtube fs-6"></i>
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="btn btn-sm btn-success rounded-circle p-2 text-white border-0">
                  <i className="bi bi-whatsapp fs-6"></i>
                </a>
              </div>
            </div>

            {/* Col 2: Services & Rentals */}
            <div className="col-lg-2 col-md-6 col-6">
              <h6 className="text-white fw-bold text-uppercase fs-7 mb-3 pb-1 border-bottom border-secondary d-inline-block" style={{ letterSpacing: '0.5px' }}>
                Rentals &amp; Stays
              </h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Car size={13} className="text-warning" />
                    <span>Airport Cabs &amp; Private Transfers</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/hotels" onClick={(e) => handleNavClick(e, 'hotels')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Building2 size={13} className="text-warning" />
                    <span>Hotels &amp; Beachfront Resorts</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/activities" onClick={(e) => handleNavClick(e, 'activities')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Compass size={13} className="text-warning" />
                    <span>Sightseeing &amp; Island Tours</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Popular Thailand Hubs */}
            <div className="col-lg-2 col-md-6 col-6">
              <h6 className="text-white fw-bold text-uppercase fs-7 mb-3 pb-1 border-bottom border-secondary d-inline-block" style={{ letterSpacing: '0.5px' }}>
                Transfer Hubs
              </h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Navigation size={13} className="text-info" />
                    <span>Don Mueang Airport (DMK)</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Navigation size={13} className="text-info" />
                    <span>Suvarnabhumi Airport (BKK)</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Navigation size={13} className="text-info" />
                    <span>Phuket International Airport (HKT)</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <Navigation size={13} className="text-info" />
                    <span>Krabi International Airport (KBV)</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <MapPin size={13} className="text-info" />
                    <span>Sukhumvit &amp; Patong</span>
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/cars" onClick={(e) => handleNavClick(e, 'cars')} className="footer-link d-flex align-items-center gap-1.5 text-decoration-none">
                    <MapPin size={13} className="text-info" />
                    <span>Bangkok &amp; Kata & Karon</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Trust, Safety & Policies */}
            <div className="col-lg-2 col-md-6 col-6">
              <h6 className="text-white fw-bold text-uppercase fs-7 mb-3 pb-1 border-bottom border-secondary d-inline-block" style={{ letterSpacing: '0.5px' }}>
                Trust &amp; Policies
              </h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-start footer-link text-decoration-none"
                    onClick={() => setActiveInfoModal('cancellation')}
                  >
                    Cancellation &amp; Refund
                  </button>
                </li>
                <li className="mb-2">
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-start footer-link text-decoration-none"
                    onClick={() => setActiveInfoModal('deposit')}
                  >
                    Chauffeur &amp; Transfer Policy
                  </button>
                </li>
                <li className="mb-2">
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-start footer-link text-decoration-none"
                    onClick={() => setActiveInfoModal('terms')}
                  >
                    Terms of Service
                  </button>
                </li>
                <li className="mb-2">
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-start footer-link text-decoration-none"
                    onClick={() => setActiveInfoModal('privacy')}
                  >
                    Privacy Policy
                  </button>
                </li>
                <li className="mb-2">
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-start footer-link text-decoration-none"
                    onClick={() => setActiveInfoModal('faqs')}
                  >
                    FAQs &amp; Guidelines
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 5: Contact & 24/7 Helpline */}
            <div className="col-lg-3 col-md-6 col-12">
              <h6 className="text-white fw-bold text-uppercase fs-7 mb-3 pb-1 border-bottom border-secondary d-inline-block" style={{ letterSpacing: '0.5px' }}>
                Contact &amp; Helpline
              </h6>
              <div className="mb-2.5">
                <div className="text-muted small d-flex align-items-start gap-2">
                  <MapPin size={16} className="text-warning flex-shrink-0 mt-1" />
                  <span>{address}</span>
                </div>
              </div>
              <div className="mb-2.5">
                <a href={`tel:${phone}`} className="text-white text-decoration-none small d-flex align-items-center gap-2 hover-opacity-100">
                  <Phone size={16} className="text-warning flex-shrink-0" />
                  <span className="fw-bold">{phone}</span>
                </a>
              </div>
              <div className="mb-2.5">
                <a href={`mailto:${email}`} className="text-muted text-decoration-none small d-flex align-items-center gap-2 hover-opacity-100">
                  <Mail size={16} className="text-warning flex-shrink-0" />
                  <span>{email}</span>
                </a>
              </div>
              <div className="mb-3">
                <div className="text-muted small d-flex align-items-center gap-2">
                  <Clock size={16} className="text-warning flex-shrink-0" />
                  <span><strong>24/7</strong> Support &amp; Roadside Dispatch</span>
                </div>
              </div>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-sm btn-outline-success text-white w-100 rounded-pill py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-xs"
                style={{ borderColor: '#25D366' }}
              >
                <MessageSquare size={16} className="text-success" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Payment Badges & Copyright Row */}
          <div className="border-top border-secondary pt-4 mt-5">
            <div className="row align-items-center gy-3">
              <div className="col-md-6 text-center text-md-start">
                <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2">
                  <span className="small text-muted me-1">Secure Payments:</span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-1.5 px-2">PromptPay</span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-1.5 px-2">Thai QR Payment</span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-1.5 px-2">TrueMoney Wallet</span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-1.5 px-2">Visa / MC</span>
                  <span className="badge bg-dark border border-secondary text-light fw-normal py-1.5 px-2">JCB / UnionPay</span>
                </div>
              </div>
              <div className="col-md-6 text-center text-md-end">
                <p className="small text-muted mb-0">
                  &copy; 2026 WOW THAILAND Technologies. All rights reserved. Registered Tourism Network in Thailand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Info / Policy Modal */}
      {activeInfoModal && infoModalsData[activeInfoModal] && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1060 }}
          onClick={() => setActiveInfoModal(null)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-dark text-white p-3.5 border-bottom border-secondary">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="rounded-circle p-2 bg-warning text-dark">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-white fs-6 mb-0">{infoModalsData[activeInfoModal].title}</h5>
                    <p className="text-white-50 text-xxs mb-0">{infoModalsData[activeInfoModal].subtitle}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  aria-label="Close"
                  onClick={() => setActiveInfoModal(null)}
                />
              </div>
              <div className="modal-body p-4 text-start">
                {infoModalsData[activeInfoModal].content}
              </div>
              <div className="modal-footer bg-light p-3 border-top">
                <button 
                  type="button" 
                  className="btn btn-dark btn-sm rounded-pill px-4 fw-semibold"
                  onClick={() => setActiveInfoModal(null)}
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
