import React, { useState, useEffect } from 'react';
import { Compass, LogOut, User, Briefcase, Hotel, Car, CircleUser } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import { isCabVendorRole, isB2BRole } from '../utils/vendorRoles';

export default function Navbar({ activeTab, setActiveTab, currentUser, triggerOpenLogin, onOpenLogin, onLogout, isOverHero = true }) {
  const { liveConfig } = useSiteConfig();
  const handleOpenLogin = triggerOpenLogin || onOpenLogin;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark premium-navbar ${isOverHero ? 'over-hero' : ''} ${isScrolled ? 'scrolled' : ''}`}>
      <style>{`
        .navbar-brand-temple {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .temple-logo-svg {
          width: 32px;
          height: 32px;
          filter: drop-shadow(0 2px 8px rgba(245, 197, 24, 0.5));
        }
        .brand-text-title {
          font-family: 'Cinzel', serif;
          font-weight: 800;
          font-size: 19px;
          letter-spacing: 1px;
          line-height: 1.1;
          color: #ffffff;
        }
        .brand-text-gold {
          color: #F5C518;
          font-weight: 900;
        }
        .brand-text-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 10.5px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
          display: block;
        }

        .nav-link-cinema {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none !important;
          color: rgba(255, 255, 255, 0.85) !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          padding: 8px 14px !important;
          border-radius: 20px;
          transition: all 0.2s ease;
        }
        .nav-link-cinema:hover {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.1);
        }
        .nav-link-cinema.active {
          color: #F5C518 !important;
          background: rgba(245, 197, 24, 0.12);
        }

        .btn-b2b-glass {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff !important;
          font-size: 13px;
          font-weight: 600;
          padding: 7px 16px;
          border-radius: 20px;
          text-decoration: none;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
        }
        .btn-b2b-glass:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(245, 197, 24, 0.6);
          color: #F5C518 !important;
        }

        .btn-gold-login {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #F5C518, #E5A826);
          color: #06101E !important;
          font-size: 13.5px;
          font-weight: 800;
          padding: 7px 20px;
          border-radius: 20px;
          border: none;
          box-shadow: 0 4px 14px rgba(245, 197, 24, 0.35);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .btn-gold-login:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(245, 197, 24, 0.55);
          background: linear-gradient(135deg, #FFE066, #F5C518);
        }
      `}</style>
      
      <div className="container-fluid px-xl-5 px-lg-4 px-3" style={{ maxWidth: '1440px' }}>
        
        {/* Brand with Golden Thai Temple Icon */}
        <a 
          className="navbar-brand navbar-brand-temple" 
          href="/" 
          onClick={(e) => { e.preventDefault(); setActiveTab('hotels'); }}
        >
          {/* Authentic Gold Thai Temple / Chedi Silhouette */}
          <svg className="temple-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1.5L13.2 4.5H10.8L12 1.5Z" fill="#F5C518"/>
            <path d="M12 4.5L14 8H10L12 4.5Z" fill="#F5C518"/>
            <path d="M8 8.5L12 6L16 8.5L15 12H9L8 8.5Z" fill="#F5C518"/>
            <path d="M6 12.5L12 10L18 12.5L17 17H7L6 12.5Z" fill="#F5C518"/>
            <path d="M4 17.5L12 15.5L20 17.5L19.5 21H4.5L4 17.5Z" fill="#F5C518"/>
            <rect x="3" y="21" width="18" height="2" rx="0.5" fill="#E5A826"/>
          </svg>
          <div>
            <span className="brand-text-title">WOW <span className="brand-text-gold">THAILAND</span></span>
            <span className="brand-text-subtitle">Luxury Travel &amp; Transfers</span>
          </div>
        </a>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav align-items-center gap-2">
            
            {/* Center Service Tabs */}
            <li className="nav-item">
              <a 
                className={`nav-link-cinema ${activeTab === 'hotels' ? 'active' : ''}`}
                href="/hotels"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('hotels');
                }}
              >
                <Hotel size={15} />
                <span>Hotels</span>
              </a>
            </li>

            <li className="nav-item">
              <a 
                className={`nav-link-cinema ${activeTab === 'sightseeing' || activeTab === 'activities' ? 'active' : ''}`}
                href="/sightseeing"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('sightseeing');
                  setTimeout(() => {
                    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
              >
                <Compass size={15} />
                <span>Sightseeing &amp; Activities</span>
              </a>
            </li>

            <li className="nav-item">
              <a 
                className={`nav-link-cinema ${activeTab === 'cabs' ? 'active' : ''}`}
                href="/cabs"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('cabs');
                }}
              >
                <Car size={15} />
                <span>Transfers</span>
              </a>
            </li>

            {/* Customer Portal Button: bookings, ride tracking, wallet & profile (signs in by OTP if needed) */}
            <li className="nav-item">
              <a
                className="btn-b2b-glass"
                href="/customer"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('customer');
                  window.history.pushState(null, '', '/customer');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                <CircleUser size={14} />
                <span>Customer Portal</span>
              </a>
            </li>

            {/* B2B Portal Button */}
            <li className="nav-item">
              <a 
                className="btn-b2b-glass" 
                href="/b2b"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('b2b');
                  window.history.pushState(null, '', '/b2b');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                <Briefcase size={14} />
                <span>B2B Portal</span>
              </a>
            </li>

            {/* Conditional Authentication Display */}
            {currentUser ? (
              <li className="nav-item ms-lg-1 dropdown">
                <a className="nav-link dropdown-toggle d-flex align-items-center gap-2 text-white py-1 px-2" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                    <User size={15} />
                  </div>
                </a>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2" aria-labelledby="profileDropdown">
                  <li className="px-3 py-2 border-bottom mb-2 bg-light">
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '13px' }}>{currentUser.username || currentUser.name}</div>
                    <span className="badge bg-primary text-uppercase" style={{ fontSize: '9px' }}>{currentUser.role}</span>
                  </li>
                  {(currentUser.role === 'subadmin' || currentUser.role === 'sub_admin') && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-purple" 
                        style={{ fontSize: '13px', color: '#7c3aed' }}
                        href="/sub-admin"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('portal');
                          window.history.pushState(null, '', '/sub-admin');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>🛡️ Sub-Admin Portal</span>
                      </a>
                    </li>
                  )}
                  {['admin', 'superadmin'].includes(currentUser.role) && (
                    <>
                      <li>
                        <a 
                          className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-primary" 
                          style={{ fontSize: '13px' }}
                          href="/admin"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('admin');
                            window.history.pushState(null, '', '/admin');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                        >
                          <span>⚙️ Master Operations Console</span>
                        </a>
                      </li>
                      <li>
                        <a 
                          className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-success" 
                          style={{ fontSize: '13px' }}
                          href="/super-admin"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('super-admin');
                            window.history.pushState(null, '', '/super-admin');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                        >
                          <span>👑 Executive SuperAdmin</span>
                        </a>
                      </li>
                    </>
                  )}
                  {isB2BRole(currentUser.role) && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-primary" 
                        style={{ fontSize: '13px' }}
                        href="/b2b"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('b2b');
                          window.history.pushState(null, '', '/b2b');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>💼 B2B Partner Hub</span>
                      </a>
                    </li>
                  )}
                  {currentUser.role === 'driver' && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-warning" 
                        style={{ fontSize: '13px' }}
                        href="/driver"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('driver');
                          window.history.pushState(null, '', '/driver');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>🚗 Driver Portal</span>
                      </a>
                    </li>
                  )}
                  {(currentUser.role === 'customer' || currentUser.role === 'user') && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-primary" 
                        style={{ fontSize: '13px' }}
                        href="/dashboard"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('dashboard');
                          window.history.pushState(null, '', '/dashboard');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>👤 Customer Dashboard</span>
                      </a>
                    </li>
                  )}
                  {isCabVendorRole(currentUser.role) && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-dark" 
                        style={{ fontSize: '13px' }}
                        href="/vendor"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('portal');
                          window.history.pushState(null, '', '/vendor');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>🚕 Cab Vendor Portal</span>
                      </a>
                    </li>
                  )}
                  {currentUser.role === 'hotel_vendor' && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-dark" 
                        style={{ fontSize: '13px' }}
                        href="/hotel-vendor"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('portal');
                          window.history.pushState(null, '', '/hotel-vendor');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>🏨 Hotel Vendor Portal</span>
                      </a>
                    </li>
                  )}
                  {currentUser.role === 'tour_vendor' && (
                    <li>
                      <a 
                        className="dropdown-item d-flex align-items-center gap-2 py-2 fw-bold text-dark" 
                        style={{ fontSize: '13px' }}
                        href="/vendor"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab('portal');
                          window.history.pushState(null, '', '/vendor');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <span>🧭 Sightseeing & Activities Vendor</span>
                      </a>
                    </li>
                  )}
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button 
                      className="dropdown-item text-danger d-flex align-items-center gap-2 py-2 fw-bold" 
                      style={{ fontSize: '13px' }}
                      onClick={onLogout}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="nav-item ms-lg-1">
                <button
                  type="button"
                  className="btn-gold-login"
                  onClick={handleOpenLogin}
                >
                  <User size={14} />
                  <span>Login</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
