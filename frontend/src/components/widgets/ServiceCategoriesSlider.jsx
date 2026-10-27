import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Compass, 
  Car, 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  Star, 
  Sparkles,
  Bike,
  Palmtree
} from 'lucide-react';
import './ServiceCategoriesSlider.css';

// ─── 6 AUTHORITATIVE THAILAND SERVICE CATEGORIES ─────────────────────────────
const SERVICE_CATEGORIES = [
  {
    id: 'hotels',
    tabTarget: 'hotels',
    categoryTag: 'Luxury Stays',
    title: 'Hotels & Luxury Resorts',
    tagline: 'Oceanfront pool villas, 5-star beachfront resorts & boutique suites',
    rating: '4.98',
    reviewsCount: '2.4k+ verified stays',
    categoryIcon: Building2,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: '5-Star Beachfront', dotColor: '#FF9F1C' },
      { text: 'Bangkok & Phuket', dotColor: '#38BDF8' },
      { text: 'Free Daily Breakfast', dotColor: '#34D399' },
      { text: 'Private Pool Access', dotColor: '#F472B6' }
    ],
    actionLabel: 'Explore Luxury Hotels',
    route: '/hotels'
  },
  {
    id: 'cabs',
    tabTarget: 'cabs',
    categoryTag: 'VIP Chauffeurs & Transfers',
    title: 'Cab Pickup & Drop / Transfers',
    tagline: 'Airport transfers, point-to-point hotel rides, sedans & VIP passenger vans',
    rating: '4.99',
    reviewsCount: '1.9k+ smooth rides',
    categoryIcon: Car,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: 'BKK / DMK / HKT Transfers', dotColor: '#FF9F1C' },
      { text: 'VIP Vans & Sedans', dotColor: '#38BDF8' },
      { text: 'Chauffeur Operated', dotColor: '#34D399' },
      { text: 'Flight Tracking Included', dotColor: '#F472B6' }
    ],
    actionLabel: 'Book Cab Transfers',
    route: '/cabs'
  },
  {
    id: 'sightseeing',
    tabTarget: 'sightseeing',
    categoryTag: 'Island & City Excursions',
    title: 'Sightseeing Tours',
    tagline: 'Phi Phi island speedboats, James Bond sea caves & Chao Phraya dinner cruises',
    rating: '4.95',
    reviewsCount: '3.8k+ happy travelers',
    categoryIcon: Compass,
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: 'Phi Phi Islands', dotColor: '#FF9F1C' },
      { text: 'James Bond Sea Caves', dotColor: '#38BDF8' },
      { text: 'Chao Phraya Cruise', dotColor: '#34D399' },
      { text: 'Certified Tour Guides', dotColor: '#F472B6' }
    ],
    actionLabel: 'Discover Sightseeing',
    route: '/sightseeing'
  },
  {
    id: 'activities',
    tabTarget: 'activities',
    categoryTag: 'Adventure & Experiences',
    title: 'Activities & Experiences',
    tagline: 'Scuba diving, ethical elephant sanctuaries, cooking masterclasses & water sports',
    rating: '4.96',
    reviewsCount: '1.5k+ bookings',
    categoryIcon: Sparkles,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: 'Water Sports & Scuba', dotColor: '#FF9F1C' },
      { text: 'Elephant Care Centers', dotColor: '#38BDF8' },
      { text: 'Thai Culinary Classes', dotColor: '#34D399' },
      { text: 'Instant Voucher Confirmed', dotColor: '#F472B6' }
    ],
    actionLabel: 'Book Activities',
    route: '/activities'
  },
  {
    id: 'selfdrive',
    tabTarget: 'cars',
    categoryTag: 'Freedom Road Trips',
    title: 'Self-Drive Bikes & Cars',
    tagline: 'Rent scooters, convertibles & premium SUVs across Phuket, Samui & Chiang Mai',
    rating: '4.97',
    reviewsCount: '2.1k+ road explorers',
    categoryIcon: Bike,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: 'Doorstep Hotel Delivery', dotColor: '#FF9F1C' },
      { text: 'Zero Hidden Deposit', dotColor: '#38BDF8' },
      { text: 'Comprehensive Insurance', dotColor: '#34D399' },
      { text: '24/7 Roadside Assistance', dotColor: '#F472B6' }
    ],
    actionLabel: 'Explore Self-Drive',
    route: '/cars'
  },
  {
    id: 'packages',
    tabTarget: 'packages',
    categoryTag: 'Curated Multi-Day Trips',
    title: 'Crafted VIP Holiday Packages',
    tagline: 'All-inclusive Thailand vacations with island hopping, luxury stays & VIP transfers',
    rating: '4.99',
    reviewsCount: '4.2k+ dream trips',
    categoryIcon: Palmtree,
    image: 'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: '100% Customizable', dotColor: '#FF9F1C' },
      { text: 'Dedicated Trip Concierge', dotColor: '#38BDF8' },
      { text: 'Honeymoon & Family Spec', dotColor: '#34D399' },
      { text: 'Best Price Guaranteed', dotColor: '#F472B6' }
    ],
    actionLabel: 'Plan Custom Trip',
    route: '/packages'
  }
];

// Tripled list for a seamless, continuous, infinite marquee wrap
const INFINITE_ITEMS = [
  ...SERVICE_CATEGORIES,
  ...SERVICE_CATEGORIES,
  ...SERVICE_CATEGORIES
];

export default function ServiceCategoriesSlider({ activeTab, setActiveTab }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Auto-scroll control flags
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  // Mouse drag state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Track active slide index based on activeTab
  useEffect(() => {
    const idx = SERVICE_CATEGORIES.findIndex(
      (c) => c.id === activeTab || c.tabTarget === activeTab || (c.id === 'hotels' && activeTab === 'hotels')
    );
    if (idx !== -1) {
      setActiveSlideIndex(idx);
    }
  }, [activeTab]);

  // Pause helper with auto-resume timer
  const pauseAutoScroll = useCallback((duration = 3500) => {
    isPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, duration);
  }, []);

  // ─── TRUE CONTINUOUS INFINITE AUTO-SLIDE LOOP ──────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId;
    let lastTime = performance.now();
    const speed = 0.85; // Silky smooth 50-55px/second continuous glide

    const step = (now) => {
      const delta = now - lastTime;
      lastTime = now;
      const factor = Math.min(delta / 16.67, 2.0);

      if (!isPausedRef.current && !isDraggingRef.current && el) {
        el.scrollLeft += speed * factor;

        // Measure single loop width dynamically: distance from card 0 to card 6 (one complete set)
        const totalBaseItems = SERVICE_CATEGORIES.length;
        if (el.children && el.children.length >= totalBaseItems * 2) {
          const firstCard = el.children[0];
          const wrapCard = el.children[totalBaseItems];
          if (firstCard && wrapCard) {
            const oneSetWidth = wrapCard.offsetLeft - firstCard.offsetLeft;
            // Seamless wrap reset: invisible jump back by exactly oneSetWidth
            if (oneSetWidth > 0 && el.scrollLeft >= oneSetWidth) {
              el.scrollLeft -= oneSetWidth;
            }
          }
        }
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Update active slide index during scroll for pagination dots
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 370 + 24; // card width + gap
    const rawIdx = Math.round(el.scrollLeft / cardWidth);
    const normalizedIdx = ((rawIdx % SERVICE_CATEGORIES.length) + SERVICE_CATEGORIES.length) % SERVICE_CATEGORIES.length;
    setActiveSlideIndex(normalizedIdx);
  };

  // Scroll to specific card by index
  const scrollToCard = (index) => {
    pauseAutoScroll(4000);
    setActiveSlideIndex(index);
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 370 + 24;
    const targetScroll = index * cardWidth;
    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  // Arrow button navigation (jump by 1 full card: 394px)
  const handleScrollLeft = () => {
    pauseAutoScroll(4000);
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 370 + 24;

    // If near the left edge, silently jump ahead by one set to allow infinite left scrolling
    const totalBaseItems = SERVICE_CATEGORIES.length;
    if (el.children && el.children.length >= totalBaseItems * 2) {
      const firstCard = el.children[0];
      const wrapCard = el.children[totalBaseItems];
      if (firstCard && wrapCard) {
        const oneSetWidth = wrapCard.offsetLeft - firstCard.offsetLeft;
        if (oneSetWidth > 0 && el.scrollLeft < cardWidth) {
          el.scrollLeft += oneSetWidth;
        }
      }
    }
    el.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    pauseAutoScroll(4000);
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 370 + 24;
    el.scrollBy({ left: cardWidth, behavior: 'smooth' });
  };

  // Mouse drag to scroll handlers
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStartRef.current = scrollRef.current.scrollLeft;
    pauseAutoScroll(5000);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;
    if (Math.abs(walk) > 8) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      pauseAutoScroll(2000);
    }
  };

  // Category Selection & Smooth Scroll to Results
  const handleCategoryClick = (category) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    if (setActiveTab) {
      setActiveTab(category.tabTarget || category.id);
    }

    // Smoothly scroll down to the category results section
    setTimeout(() => {
      const resultsTarget = document.getElementById('results-section');
      if (resultsTarget) {
        resultsTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  return (
    <section className="service-categories-slider-section" id="categories-slider">
      <div className="container">
        {/* Header with Luxury Eyebrow & Navigation Arrows */}
        <div className="scs-header-container">
          <div className="scs-header-left">
            <div className="scs-eyebrow">
              <Sparkles size={14} className="scs-sparkle-icon" />
              <span>DISCOVER AMAZING THAILAND</span>
            </div>
            <h2 className="scs-title">Explore Thailand by Service Category</h2>
            <p className="scs-subtitle">
              Handpicked 5-star beachfront resorts, breathtaking island excursions, executive private airport transfers & road trips.
            </p>
          </div>

          {/* Top-Right Glassmorphic Nav Arrows */}
          <div className="scs-header-nav-btns d-none d-md-flex">
            <button
              type="button"
              className="scs-nav-btn"
              onClick={handleScrollLeft}
              aria-label="Previous Category"
              title="Previous"
            >
              <ArrowLeft size={19} />
            </button>
            <button
              type="button"
              className="scs-nav-btn"
              onClick={handleScrollRight}
              aria-label="Next Category"
              title="Next"
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>

        {/* Horizontal Auto-Sliding Cinematic Luxury Cards Track */}
        <div className="scs-scroll-track-wrapper">
          <div
            className={`scs-scroll-track ${isDragging ? 'is-dragging' : ''}`}
            ref={scrollRef}
            onScroll={handleScroll}
            onMouseEnter={() => { isPausedRef.current = true; }}
            onMouseLeave={() => { 
              handleMouseUpOrLeave();
              pauseAutoScroll(1500); 
            }}
            onTouchStart={() => pauseAutoScroll(5000)}
            onTouchEnd={() => pauseAutoScroll(2000)}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
          >
            {INFINITE_ITEMS.map((cat, index) => {
              const CategoryIcon = cat.categoryIcon;
              const isActive = activeTab === cat.id || 
                               activeTab === cat.tabTarget || 
                               (cat.id === 'hotels' && activeTab === 'hotels');

              return (
                <div
                  key={`${cat.id}-${index}`}
                  className={`scs-luxury-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryClick(cat);
                    }
                  }}
                  aria-pressed={isActive}
                >
                  {/* Full-Bleed Cinematic Photography */}
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="scs-card-bg-img"
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = cat.fallbackImage;
                    }}
                  />

                  {/* Multi-Layer Cinematic Gradient Scrims for Text & Badge Legibility */}
                  <div className="scs-card-scrim-top" />
                  <div className="scs-card-scrim-bottom" />
                  <div className="scs-card-ambient-glow" />

                  {/* Top Glassmorphism Badges Bar */}
                  <div className="scs-card-top-bar">
                    <div className="scs-tag-pill">
                      {CategoryIcon && <CategoryIcon size={14} className="scs-tag-icon" />}
                      <span>{cat.categoryTag}</span>
                    </div>

                    <div className="scs-rating-badge">
                      <Star size={13} className="scs-rating-star" />
                      <span className="scs-rating-val">{cat.rating}</span>
                    </div>
                  </div>

                  {/* Active Selection Glow Ring Indicator */}
                  {isActive && (
                    <div className="scs-active-badge-indicator">
                      <span className="scs-active-pulsing-dot" />
                      <span>SELECTED SERVICE</span>
                    </div>
                  )}

                  {/* Bottom Cinematic Card Body */}
                  <div className="scs-card-bottom-content">
                    <div className="scs-title-group">
                      <h3 className="scs-luxury-title">{cat.title}</h3>
                      <p className="scs-luxury-tagline">{cat.tagline}</p>
                    </div>

                    {/* Frosted Glass Highlight Micro-Pills */}
                    <div className="scs-luxury-pills-wrap">
                      {cat.highlights.map((pill, pIdx) => (
                        <span key={pIdx} className="scs-luxury-pill">
                          <span 
                            className="scs-pill-dot" 
                            style={{ backgroundColor: pill.dotColor }} 
                          />
                          <span>{pill.text}</span>
                        </span>
                      ))}
                    </div>

                    {/* Full-Width Luxury Gradient Action Button */}
                    <div className="scs-action-btn-wrap">
                      <a
                        href={cat.route}
                        className={`scs-luxury-action-btn ${isActive ? 'is-active-btn' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCategoryClick(cat);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="scs-btn-label">{cat.actionLabel}</span>
                        <div className="scs-btn-arrow-badge">
                          <ArrowRight size={15} />
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Bottom Control Bar: Pagination Dots & Navigation */}
        <div className="scs-carousel-bottom-bar">
          <div className="scs-pagination-dots">
            {SERVICE_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                className={`scs-dot ${activeSlideIndex === idx ? 'is-active' : ''}`}
                onClick={() => scrollToCard(idx)}
                aria-label={`Go to ${cat.title}`}
                title={cat.title}
              />
            ))}
          </div>

          <div className="scs-bottom-nav-btns d-flex d-md-none">
            <button
              type="button"
              className="scs-nav-btn-mobile"
              onClick={handleScrollLeft}
              aria-label="Previous Category"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="scs-nav-btn-mobile"
              onClick={handleScrollRight}
              aria-label="Next Category"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
