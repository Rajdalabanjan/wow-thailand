import React, { useState, useEffect, useRef } from 'react';
import {
  Car, Hotel, Compass, ShieldCheck, Sparkles, MapPin, 
  Clock, QrCode, MessageSquare, ChevronRight, CheckCircle2,
  Navigation, Star, ArrowUpRight
} from 'lucide-react';

const SCROLL_SLIDES = [
  {
    id: 'cabs',
    tag: 'REAL-TIME DISPATCH & TELEMETRY',
    title: 'Airport Chauffeur & Live Tracking',
    subtitle: 'From Suvarnabhumi or Phuket Airport straight to your luxury villa. Track your chauffeur in real time with genuine GPS telemetry and verified 4-digit start OTP.',
    icon: <Car size={18} className="text-warning" />,
    stats: [
      { label: 'Fleet Tier', value: 'VIP Sedan / Van' },
      { label: 'Surge Pricing', value: 'Zero (Fixed)' },
      { label: 'Security', value: '4-Digit OTP' }
    ],
    screen: {
      header: 'Suvarnabhumi Airport (BKK) ➔ Bangkok Central',
      badge: 'ON TRIP · DRIVER EN ROUTE',
      badgeColor: '#10B981',
      title: 'Toyota Camry Executive VIP',
      meta: 'Driver Somchai S. • Plate: 1กข-8924',
      eta: '8 mins to pickup',
      otp: 'START CODE: 6647',
      accentColor: '#F5C518'
    },
    tilt: { rx: 12, ry: -16, rz: -3 }
  },
  {
    id: 'hotels',
    tag: '5-STAR RESORT PASS',
    title: 'Instant Hotel Check-In & Digital Voucher',
    subtitle: 'Atomic room reservation with instant PDF vouchers and digital wallet billing. Present your high-security QR voucher at reception for expedited VIP check-in.',
    icon: <Hotel size={18} className="text-primary" />,
    stats: [
      { label: 'Reservation', value: 'Instant Confirm' },
      { label: 'Room Lock', value: 'Atomic Decr' },
      { label: 'Payment', value: 'THB / INR / USD' }
    ],
    screen: {
      header: 'The Naka Island Luxury Lagoon Resort',
      badge: 'CONFIRMED · GUARANTEED STAY',
      badgeColor: '#3B82F6',
      title: 'Seaview Private Pool Villa',
      meta: 'Check-in: 14:00 • 2 Adults • Breakfast Included',
      eta: 'VCH-20261113-9545',
      otp: 'SCAN FOR EXPRESS CHECK-IN',
      accentColor: '#3B82F6'
    },
    tilt: { rx: 4, ry: 6, rz: 2 }
  },
  {
    id: 'tours',
    tag: 'SIGNATURE EXPERIENCES',
    title: 'Curated Island Tours & VIP Access',
    subtitle: 'Speedboat transfers to Phi Phi, James Bond Island, and coral sanctuaries. Certified English-speaking guides, insurance, and national park permits all included.',
    icon: <Compass size={18} className="text-danger" />,
    stats: [
      { label: 'Marine Route', value: 'Phi Phi & Maya Bay' },
      { label: 'Vessel', value: 'Twin-Engine Catamaran' },
      { label: 'Permits', value: '100% Included' }
    ],
    screen: {
      header: 'Phi Phi & Maya Bay Luxury Catamaran',
      badge: 'CONFIRMED · PRIVATE DECK',
      badgeColor: '#EC4899',
      title: 'Full Day Snorkeling & Sunset Cruise',
      meta: 'Departure: Royal Phuket Marina • Pier Gate 4',
      eta: 'Departs 08:30 AM',
      otp: 'VIP PASS: TH-EXP-4029',
      accentColor: '#EC4899'
    },
    tilt: { rx: 10, ry: -12, rz: -2 }
  },
  {
    id: 'concierge',
    tag: '24/7 DEDICATED ASSISTANT',
    title: 'AI Travel Concierge & WhatsApp Support',
    subtitle: 'Bilingual assistance in English and Thai. Get restaurant reservations, adjust pickup times, or request customized itinerary tweaks with one tap.',
    icon: <MessageSquare size={18} className="text-success" />,
    stats: [
      { label: 'Response', value: '< 15 Seconds' },
      { label: 'Languages', value: 'EN / TH / HI' },
      { label: 'Channels', value: 'App & WhatsApp' }
    ],
    screen: {
      header: 'WOW THAILAND Private Concierge',
      badge: 'LIVE · CHAUFFEUR STANDBY',
      badgeColor: '#10B981',
      title: 'VIP Flight Tracker Active',
      meta: 'Flight TG-317 landed 12 mins ahead of schedule',
      eta: 'Chauffeur waiting at Gate 3 with placard',
      otp: 'CONCIERGE HOTLINE ACTIVE',
      accentColor: '#10B981'
    },
    tilt: { rx: 2, ry: 14, rz: 3 }
  }
];

export default function Concierge3DExperience({ onNavigateTab }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);

  // Auto-cycle through slides every 5 seconds unless user manually interacts
  useEffect(() => {
    if (!isAutoPlaying) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % SCROLL_SLIDES.length);
    }, 5200);
    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlaying]);

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMouseOffset({ x, y });
  };

  const handlePointerLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const currentSlide = SCROLL_SLIDES[activeIdx] || SCROLL_SLIDES[0];

  // Combine base slide tilt with interactive pointer parallax
  const baseTilt = currentSlide.tilt;
  const rotX = baseTilt.rx - mouseOffset.y * 8;
  const rotY = baseTilt.ry + mouseOffset.x * 12;
  const rotZ = baseTilt.rz;

  return (
    <section 
      className="concierge-3d-section py-5 position-relative overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        background: 'linear-gradient(180deg, #050b18 0%, #070f23 50%, #040814 100%)',
        color: '#ffffff',
        borderTop: '1px solid rgba(245, 197, 24, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Background Ambience Caustics & Gold Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 197, 24, 0.12) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 70%)',
          filter: 'blur(70px)',
          transform: `translate3d(${-mouseOffset.x * 30}px, ${-mouseOffset.y * 20}px, 0)`,
          transition: 'transform 0.4s ease-out',
          pointerEvents: 'none'
        }}
      />

      <div className="container position-relative py-lg-4" style={{ zIndex: 10 }}>
        
        {/* Top Header Eyebrow */}
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3" style={{ background: 'rgba(245, 197, 24, 0.1)', border: '1px solid rgba(245, 197, 24, 0.3)' }}>
            <Sparkles size={14} className="text-warning" />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.22em', color: '#F5C518' }}>
              ✦ WOW THAILAND DIGITAL CONCIERGE ✦
            </span>
          </div>
          <h2 
            className="display-6 fw-black mb-2"
            style={{
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 60%, #E2E8F0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Your Entire Luxury Journey, Choreographed in Your Pocket
          </h2>
          <p className="text-white-50 mx-auto" style={{ maxWidth: '640px', fontSize: '14.5px' }}>
            Experience seamless coordination across private airport transfers, 5-star hotel vouchers, and speedboat excursions with genuine real-time tracking.
          </p>

          {/* Interactive Category Selector Pills */}
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            {SCROLL_SLIDES.map((sl, sIdx) => {
              const isSelected = activeIdx === sIdx;
              return (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveIdx(sIdx);
                  }}
                  className={`btn rounded-pill px-3 py-1.5 text-xs fw-bold d-flex align-items-center gap-2 transition-all ${
                    isSelected ? 'shadow-lg' : ''
                  }`}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #F5C518 0%, #D49206 100%)' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#060C1C' : '#CBD5E1',
                    border: isSelected ? '1px solid #F5C518' : '1px solid rgba(255, 255, 255, 0.12)'
                  }}
                >
                  {sl.icon}
                  <span>{sl.title.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Interactive Canvas */}
        <div className="row align-items-center g-5">
          
          {/* Left Column: Feature Storytelling & Live Specs */}
          <div className="col-lg-6 order-2 order-lg-1">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge px-2 py-0.5 rounded text-2xs fw-bold" style={{ background: 'rgba(245, 197, 24, 0.15)', color: '#F5C518' }}>
                EXPERIENCE 0{activeIdx + 1}
              </span>
              <span className="text-white-50 text-xs">● Instant Digital Synchronization</span>
            </div>

            <h3 
              key={currentSlide.id + '-heading'}
              className="fw-black mb-3 font-heading"
              style={{ fontSize: '26px', color: '#FFFFFF', animation: 'c3dFadeIn 0.4s ease-out' }}
            >
              {currentSlide.title}
            </h3>

            <p 
              key={currentSlide.id + '-desc'}
              className="text-white-50 mb-4"
              style={{ fontSize: '14px', lineHeight: 1.7, maxWidth: '520px', animation: 'c3dFadeIn 0.5s ease-out' }}
            >
              {currentSlide.subtitle}
            </p>

            {/* Spec Highlights Grid */}
            <div className="row g-2 mb-4" style={{ maxWidth: '480px' }}>
              {currentSlide.stats.map((st, idx) => (
                <div key={idx} className="col-4">
                  <div 
                    className="p-2.5 rounded-3 text-center"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <div className="text-white fw-bold" style={{ fontSize: '13px' }}>{st.value}</div>
                    <div className="text-white-50" style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{st.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab(activeIdx === 0 ? 'cabs' : activeIdx === 1 ? 'hotels' : 'sightseeing')}
                className="btn rounded-pill px-4 py-2.5 fw-bold d-flex align-items-center gap-2 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #F5C518 0%, #D49206 100%)',
                  color: '#060C1C',
                  fontSize: '13px',
                  letterSpacing: '0.04em'
                }}
              >
                <span>Book This Feature Now →</span>
              </button>

              <a
                href="/customer"
                className="btn rounded-pill px-4 py-2.5 fw-semibold d-flex align-items-center gap-1.5"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  fontSize: '13px'
                }}
              >
                <span>Customer Portal</span>
                <ArrowUpRight size={14} />
              </a>
            </div>

            {/* Interactive Progress Indicator Dots */}
            <div className="d-flex align-items-center gap-2 mt-4 pt-2">
              {SCROLL_SLIDES.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveIdx(idx);
                  }}
                  className="cursor-pointer"
                  style={{
                    width: activeIdx === idx ? '28px' : '8px',
                    height: '6px',
                    borderRadius: '999px',
                    background: activeIdx === idx ? '#F5C518' : 'rgba(255, 255, 255, 0.25)',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer'
                  }}
                />
              ))}
              <span className="text-white-50 ms-2" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                0{activeIdx + 1} / 0{SCROLL_SLIDES.length}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Floating Interactive Tablet */}
          <div className="col-lg-6 order-1 order-lg-2 text-center">
            <div 
              className="device-perspective-wrap"
              style={{
                perspective: '1200px',
                display: 'inline-block',
                width: '100%',
                maxWidth: '540px'
              }}
            >
              {/* 3D Rotating Device Frame with Titanium Finish */}
              <div 
                className="device-chassis"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 10.5',
                  borderRadius: '26px',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 50%, #171923 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 50px rgba(245, 197, 24, 0.15)',
                  transform: `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  willChange: 'transform'
                }}
              >
                {/* Outer Titanium Rim Specular Highlight */}
                <div 
                  style={{
                    position: 'absolute',
                    inset: '-1px',
                    borderRadius: '26px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(245,197,24,0.3) 100%)',
                    pointerEvents: 'none',
                    opacity: 0.6
                  }}
                />

                {/* Device Front Camera */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#090D16',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 20
                  }}
                />

                {/* OLED Display */}
                <div 
                  className="device-screen"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: '18px',
                    background: '#070D1C',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(0,0,0,0.8)'
                  }}
                >
                  {/* Status Bar */}
                  <div 
                    className="d-flex align-items-center justify-content-between px-3 py-1.5"
                    style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="d-flex align-items-center gap-1.5">
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#F5C518', letterSpacing: '0.12em' }}>WOW THAILAND</span>
                      <span className="badge bg-dark text-white-50 px-1.5 py-0" style={{ fontSize: '8px' }}>5G LIVE</span>
                    </div>
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ fontFamily: 'monospace' }}>12:45 PM</span>
                      <span style={{ color: '#10B981' }}>● 98%</span>
                    </div>
                  </div>

                  {/* Screen Content */}
                  <div 
                    key={currentSlide.id + '-screen'}
                    className="p-3 p-md-4 d-flex flex-column gap-3 flex-grow-1 text-start"
                    style={{
                      background: 'radial-gradient(circle at 80% 20%, rgba(245, 197, 24, 0.08) 0%, transparent 60%)',
                      animation: 'c3dScreenContentIn 0.45s ease-out'
                    }}
                  >
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span 
                          className="badge px-2 py-0.5 rounded-pill fw-bold"
                          style={{ 
                            background: `${currentSlide.screen.badgeColor}22`, 
                            color: currentSlide.screen.badgeColor,
                            border: `1px solid ${currentSlide.screen.badgeColor}44`,
                            fontSize: '11px'
                          }}
                        >
                          ● {currentSlide.screen.badge}
                        </span>
                        <span className="text-white-50" style={{ fontSize: '12px' }}>
                          {activeIdx === 0 ? 'GPS Telemetry Active' : activeIdx === 1 ? 'Hotel PMS Synced' : activeIdx === 2 ? 'Marine Permit Valid' : 'AI Assistant Ready'}
                        </span>
                      </div>

                      <div className="text-white fw-bold mb-1" style={{ fontSize: '22px', lineHeight: 1.2 }}>
                        {currentSlide.screen.title}
                      </div>
                      <div className="text-white-50" style={{ fontSize: '13.5px' }}>
                        📍 {currentSlide.screen.header}
                      </div>
                    </div>

                    {/* Simulation Card */}
                    <div 
                      className="rounded-3 p-3"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <span className="text-white-50" style={{ fontSize: '12.5px' }}>{currentSlide.screen.meta}</span>
                        <span className="fw-bold" style={{ fontSize: '13px', color: '#F5C518' }}>{currentSlide.screen.eta}</span>
                      </div>

                      <div 
                        className="d-flex align-items-center justify-content-between px-2.5 py-1.5 rounded-2"
                        style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(245, 197, 24, 0.25)' }}
                      >
                        <div className="d-flex align-items-center gap-1.5">
                          {activeIdx === 0 ? (
                            <Navigation size={15} className="text-warning animate-pulse" />
                          ) : activeIdx === 1 ? (
                            <QrCode size={15} className="text-primary" />
                          ) : activeIdx === 2 ? (
                            <Star size={15} className="text-danger" />
                          ) : (
                            <MessageSquare size={15} className="text-success" />
                          )}
                          <span style={{ fontSize: '12.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#FFFFFF' }}>
                            {currentSlide.screen.otp}
                          </span>
                        </div>
                        <span className="badge bg-success bg-opacity-25 text-success" style={{ fontSize: '10px' }}>
                          ✓ VERIFIED
                        </span>
                      </div>
                    </div>

                    {/* Bottom App Tabs */}
                    <div 
                      className="d-flex align-items-center justify-content-around pt-2 mt-auto border-top"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <div 
                        className="text-center cursor-pointer" 
                        onClick={() => { setIsAutoPlaying(false); setActiveIdx(0); }}
                        style={{ opacity: activeIdx === 0 ? 1 : 0.45 }}
                      >
                        <Car size={17} className={activeIdx === 0 ? "text-warning" : "text-white"} />
                        <div style={{ fontSize: '10.5px', color: '#ffffff' }}>Cabs</div>
                      </div>
                      <div 
                        className="text-center cursor-pointer" 
                        onClick={() => { setIsAutoPlaying(false); setActiveIdx(1); }}
                        style={{ opacity: activeIdx === 1 ? 1 : 0.45 }}
                      >
                        <Hotel size={17} className={activeIdx === 1 ? "text-primary" : "text-white"} />
                        <div style={{ fontSize: '10.5px', color: '#ffffff' }}>Hotels</div>
                      </div>
                      <div 
                        className="text-center cursor-pointer" 
                        onClick={() => { setIsAutoPlaying(false); setActiveIdx(2); }}
                        style={{ opacity: activeIdx === 2 ? 1 : 0.45 }}
                      >
                        <Compass size={17} className={activeIdx === 2 ? "text-danger" : "text-white"} />
                        <div style={{ fontSize: '10.5px', color: '#ffffff' }}>Tours</div>
                      </div>
                      <div 
                        className="text-center cursor-pointer" 
                        onClick={() => { setIsAutoPlaying(false); setActiveIdx(3); }}
                        style={{ opacity: activeIdx === 3 ? 1 : 0.45 }}
                      >
                        <MessageSquare size={17} className={activeIdx === 3 ? "text-success" : "text-white"} />
                        <div style={{ fontSize: '10.5px', color: '#ffffff' }}>Chat</div>
                      </div>
                    </div>

                  </div>

                  {/* Specular Glint Reflection */}
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 45%, rgba(255,255,255,0.02) 100%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes c3dFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes c3dScreenContentIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 991px) {
          .device-perspective-wrap {
            perspective: none !important;
            margin-bottom: 24px;
          }
          .device-chassis {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
