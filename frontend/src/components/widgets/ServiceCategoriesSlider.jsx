import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Compass, 
  Car,
  Building2, 
  ArrowRight, 
  Star, 
  Sparkles
} from 'lucide-react';
import './ServiceCategoriesSlider.css';

// ─── 3 AUTHORITATIVE THAILAND SERVICE CATEGORIES (MATCHING SITE NAVIGATION) ───
const SERVICE_CATEGORIES = [
  {
    id: 'hotels',
    tabTarget: 'hotels',
    categoryTag: 'Luxury Stays',
    title: 'Hotels & Resorts',
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
    title: 'Cab Pickup & Drop',
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
    categoryTag: 'Tours & Experiences',
    title: 'Sightseeing & Activities',
    tagline: 'Phi Phi speedboats, scuba diving, James Bond sea caves, elephant care & dinner cruises',
    rating: '4.98',
    reviewsCount: '5.3k+ happy travelers',
    categoryIcon: Compass,
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1000&q=85',
    fallbackImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85',
    highlights: [
      { text: 'Phi Phi & Maya Bay Tours', dotColor: '#FF9F1C' },
      { text: 'Scuba Diving & Coral Reefs', dotColor: '#38BDF8' },
      { text: 'Ethical Elephant Sanctuaries', dotColor: '#34D399' },
      { text: 'Chao Phraya Sunset Cruise', dotColor: '#F472B6' }
    ],
    actionLabel: 'Explore Sightseeing & Activities',
    route: '/sightseeing'
  }
];

export default function ServiceCategoriesSlider({ activeTab, setActiveTab }) {
  // Current circular arrangement of the 3 cards
  const [cards, setCards] = useState(SERVICE_CATEGORIES);
  const [isSliding, setIsSliding] = useState(false);
  const isHoveredRef = useRef(false);

  // Automatic Left-to-Right sliding loop with guaranteed execution
  useEffect(() => {
    let timeoutId = null;
    let animResetId = null;

    const scheduleNextSlide = () => {
      timeoutId = setTimeout(() => {
        // Only slide when not hovered and document is visible
        if (!isHoveredRef.current && document.visibilityState !== 'hidden') {
          // Trigger smooth slide to the right (Left-to-Right translation)
          setIsSliding(true);

          // Once 650ms animation finishes, rotate array and reset offset with zero transition
          animResetId = setTimeout(() => {
            setCards((prev) => [prev[prev.length - 1], ...prev.slice(0, prev.length - 1)]);
            setIsSliding(false);
            scheduleNextSlide();
          }, 650);
        } else {
          scheduleNextSlide();
        }
      }, 3000);
    };

    scheduleNextSlide();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsSliding(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animResetId) clearTimeout(animResetId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Category Selection & Smooth Scroll to Results
  const handleCategoryClick = (category) => {
    if (setActiveTab) {
      setActiveTab(category.tabTarget || category.id);
    }

    setTimeout(() => {
      const resultsTarget = document.getElementById('results-section');
      if (resultsTarget) {
        resultsTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Buffer track items:
  // [cards[last], cards[0], cards[1], cards[2], cards[last]]
  // Index 0: enters from left during slide
  // Index 1, 2, 3: The 3 visible cards at rest!
  // Index 4: exits to the right during slide
  const lastIdx = cards.length - 1;
  const displayItems = [
    { ...cards[lastIdx], _bufKey: `${cards[lastIdx].id}-buf-left` },
    { ...cards[0], _bufKey: `${cards[0].id}-slot-0` },
    { ...cards[1], _bufKey: `${cards[1].id}-slot-1` },
    { ...cards[2], _bufKey: `${cards[2].id}-slot-2` },
    { ...cards[lastIdx], _bufKey: `${cards[lastIdx].id}-buf-right` }
  ];

  return (
    <section className="service-categories-slider-section" id="categories-slider">
      <div className="container">
        {/* Header with Luxury Eyebrow */}
        <div className="scs-header-container">
          <div className="scs-header-left">
            <div className="scs-eyebrow">
              <Sparkles size={14} className="scs-sparkle-icon" />
              <span>DISCOVER AMAZING THAILAND</span>
            </div>
            <h2 className="scs-title">Explore Thailand by Service Category</h2>
            <p className="scs-subtitle">
              Handpicked 5-star beachfront resorts, executive airport transfers, and breathtaking sightseeing & activities.
            </p>
          </div>
        </div>

        {/* Crisp Viewport: Exactly 3 Services, Zero Cut-Offs, Zero Shadows */}
        <div 
          className="scs-scroll-track-wrapper scs-viewport"
          onMouseEnter={() => { isHoveredRef.current = true; }}
          onMouseLeave={() => { isHoveredRef.current = false; }}
          onTouchStart={() => { isHoveredRef.current = true; }}
          onTouchEnd={() => { isHoveredRef.current = false; }}
        >
          <div 
            className={`scs-scroll-track scs-slider-track ${isSliding ? 'is-sliding' : ''}`}
          >
            {displayItems.map((cat) => {
              const CategoryIcon = cat.categoryIcon;
              const isActive = activeTab === cat.id || 
                               activeTab === cat.tabTarget || 
                               (cat.id === 'hotels' && (activeTab === 'hotels' || activeTab === 'hotel-details')) ||
                               (cat.id === 'cabs' && (activeTab === 'cabs' || activeTab === 'car-details')) ||
                               (cat.id === 'sightseeing' && (activeTab === 'sightseeing' || activeTab === 'activities' || activeTab === 'activity-details'));

              return (
                <div
                  key={cat._bufKey}
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

        {/* Carousel Bottom Control Bar: Exactly 3 Categories Pagination Dots */}
        <div className="scs-carousel-bottom-bar">
          <div className="scs-pagination-dots">
            {SERVICE_CATEGORIES.map((cat) => {
              const isSelected = activeTab === cat.id || 
                                 activeTab === cat.tabTarget ||
                                 (cat.id === 'hotels' && (activeTab === 'hotels' || activeTab === 'hotel-details')) ||
                                 (cat.id === 'cabs' && (activeTab === 'cabs' || activeTab === 'car-details')) ||
                                 (cat.id === 'sightseeing' && (activeTab === 'sightseeing' || activeTab === 'activities' || activeTab === 'activity-details'));

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`scs-dot ${isSelected ? 'is-active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                  aria-label={`Select ${cat.title}`}
                  title={cat.title}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
