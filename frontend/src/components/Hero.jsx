import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';

const STATIC_WHITE_PREFIX = 'Historic Majesty, Luxury Stays';

const FAMOUS_DESTINATIONS = [
  {
    id: 'wat_arun',
    name: 'Wat Arun (Temple of Dawn)',
    shortName: 'Wat Arun',
    region: 'Bangkok, Chao Phraya River',
    image: '/destinations/wat_arun.jpg',
    tab: 'hotels',
    eyebrow: 'Historic Chao Phraya • Bangkok',
    headlinePrefix: STATIC_WHITE_PREFIX,
    highlightText: 'Explore Stress Free!',
    tagline: 'Marvel at Bangkok’s shimmering riverside spire at sunset, scenic dinner cruises & handpicked 5-star hotel accommodations.'
  },
  {
    id: 'maya_bay',
    name: 'Maya Bay & Phi Phi Islands',
    shortName: 'Maya Bay & Phi Phi',
    region: 'Krabi / Andaman Sea',
    image: '/destinations/maya_bay.jpg',
    tab: 'sightseeing',
    eyebrow: 'Andaman Sea Paradise • Krabi',
    headlinePrefix: STATIC_WHITE_PREFIX,
    highlightText: 'Travel Stress Free!',
    tagline: 'Sail through crystal-clear turquoise waters, towering limestone cliffs & world-famous lagoons with VIP island speedboat tours.'
  },
  {
    id: 'white_temple',
    name: 'Wat Rong Khun (White Temple)',
    shortName: 'Wat Rong Khun',
    region: 'Chiang Rai, Northern Thailand',
    image: '/destinations/white_temple.jpg',
    tab: 'sightseeing',
    eyebrow: 'Northern Masterpiece • Chiang Rai',
    headlinePrefix: STATIC_WHITE_PREFIX,
    highlightText: 'Journey Stress Free!',
    tagline: 'Experience the world-renowned silver-white architecture of Northern Thailand with private chauffeur transfers & verified local guides.'
  },
  {
    id: 'railay_beach',
    name: 'Railay Beach & Limestone Karsts',
    shortName: 'Railay Beach',
    region: 'Krabi Peninsula',
    image: '/destinations/railay_beach.jpg',
    tab: 'cabs',
    eyebrow: 'Dramatic Coastline • Krabi',
    headlinePrefix: STATIC_WHITE_PREFIX,
    highlightText: 'Unwind Stress Free!',
    tagline: 'Relax on secluded white sand shores surrounded by emerald lagoons, dramatic rock-climbing karsts & prompt airport chauffeur pickups.'
  }
];

// High-precision RAF letter-by-letter typewriter engine (butter-smooth, zero jitter, zero timer drift)
function TypewriterHighlight({ text, onCycleComplete, prefersReducedMotion }) {
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState('typing'); // 'typing' | 'paused' | 'deleting' | 'done'

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(text);
      const timer = setTimeout(() => {
        onCycleComplete();
      }, 5500);
      return () => clearTimeout(timer);
    }

    let charCount = 0;
    let currentPhase = 'typing';
    let lastTime = performance.now();
    let pauseEndTime = 0;
    let animId;

    setDisplayed('');
    setPhase('typing');

    const tick = (now) => {
      if (currentPhase === 'typing') {
        // High-precision 40ms interval per letter (consistent, rhythmic, buttery smooth)
        if (now - lastTime >= 40) {
          charCount++;
          setDisplayed(text.slice(0, charCount));
          lastTime = now;

          if (charCount >= text.length) {
            currentPhase = 'paused';
            setPhase('paused');
            pauseEndTime = now + 2600; // 2.6s comfortable reading pause
          }
        }
      } else if (currentPhase === 'paused') {
        if (now >= pauseEndTime) {
          currentPhase = 'deleting';
          setPhase('deleting');
          lastTime = now;
        }
      } else if (currentPhase === 'deleting') {
        // Clean, snappy 18ms backspace delete
        if (now - lastTime >= 18) {
          charCount--;
          setDisplayed(text.slice(0, charCount));
          lastTime = now;

          if (charCount <= 0) {
            currentPhase = 'done';
            setPhase('done');
            setTimeout(() => {
              onCycleComplete();
            }, 220);
            return;
          }
        }
      }

      if (currentPhase !== 'done') {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [text, prefersReducedMotion, onCycleComplete]);

  const isTypingOrDeleting = phase === 'typing' || phase === 'deleting';

  return (
    <>
      <span 
        className="hero-highlight-phrase"
        style={{ 
          background: 'linear-gradient(135deg, #FFE066 0%, #FF9F1C 45%, #FF5A1F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block',
          fontWeight: 950,
          letterSpacing: '-0.5px',
          textShadow: 'none',
          filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.85))',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'contents'
        }}
      >
        {displayed}
      </span>
      {!prefersReducedMotion && (
        <span 
          className={`hero-typewriter-cursor ${isTypingOrDeleting ? 'active-typing' : 'blinking'}`} 
          aria-hidden="true" 
        />
      )}
    </>
  );
}

export default function Hero({ config, onNavigateTab, activeTab }) {
  const [currentDestIdx, setCurrentDestIdx] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prevDestIdxRef = useRef(null);

  const whitePrefix = (config && config.headlinePrefix) ? config.headlinePrefix : STATIC_WHITE_PREFIX;

  // Respect prefers-reduced-motion for accessibility
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const handleCycleComplete = useCallback(() => {
    prevDestIdxRef.current = currentDestIdx;
    setCurrentDestIdx(prev => (prev + 1) % FAMOUS_DESTINATIONS.length);
  }, [currentDestIdx]);

  if (config && !config.visible) return null;

  const jumpToDestination = (idx) => {
    if (idx === currentDestIdx) return;
    prevDestIdxRef.current = currentDestIdx;
    setCurrentDestIdx(idx);
  };

  const activeDest = FAMOUS_DESTINATIONS[currentDestIdx] || FAMOUS_DESTINATIONS[0];
  const fullHeadlineText = `${whitePrefix} ${activeDest.highlightText}`;

  return (
    <header 
      className="hero-section" 
      id="hero-banner" 
      style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        background: '#070f1e', 
        minHeight: '740px',
        padding: '145px 0 220px',
        color: '#ffffff'
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.6; }
        }

        /* Base slide styles */
        .hero-bg-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          will-change: opacity, transform, filter;
          pointer-events: none;
        }

        /* ─── CINEMATIC KEN BURNS (Continuous slow zoom & soft 1.4s dissolve) ─── */
        .hero-bg-slide {
          opacity: 0;
          transform: scale(1.0);
          transition: opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1), transform 8s cubic-bezier(0.1, 0, 0.2, 1);
        }
        .hero-bg-slide.active {
          opacity: 1;
          transform: scale(1.06);
          z-index: 2;
        }
        .hero-bg-slide.prev-slide {
          opacity: 0;
          transform: scale(1.06);
          z-index: 1;
        }

        /* Seamless Kinetic Text Animation */
        @keyframes heroMessageFade {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-dynamic-block {
          animation: heroMessageFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .hero-title-white {
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 25px rgba(0, 0, 0, 0.85);
        }

        /* Flawless, Crisp Gradient Text without murky shadow bug */
        .hero-highlight-phrase {
          background: linear-gradient(135deg, #FFE066 0%, #FF9F1C 45%, #FF5A1F 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          font-weight: 950;
          text-shadow: none !important;
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.85));
          letter-spacing: -0.5px;
        }

        /* ─── HERO TYPEWRITER SOLID WHILE MOVING, BREATHING BLINK WHEN PAUSED ─── */
        .hero-typewriter-cursor {
          display: inline-block;
          width: 3.5px;
          height: 0.84em;
          background: #FF9F1C;
          margin-left: 5px;
          vertical-align: -0.05em;
          border-radius: 2px;
          box-shadow: 0 0 10px rgba(255, 159, 28, 0.95), 0 0 20px rgba(255, 107, 53, 0.6);
          will-change: opacity;
        }

        .hero-typewriter-cursor.active-typing {
          opacity: 1 !important;
          animation: none !important;
        }

        .hero-typewriter-cursor.blinking {
          animation: heroCursorBlink 0.85s infinite;
        }

        @keyframes heroCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @media (max-width: 768px) {
          .hero-typewriter-cursor {
            width: 2.5px;
            margin-left: 3px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-typewriter-cursor {
            display: none !important;
            animation: none !important;
          }
        }

        .hero-dynamic-message {
          font-size: 17px;
          line-height: 1.68;
          font-weight: 500;
          color: #ffffff;
          maxWidth: 680px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 4px 16px rgba(0, 0, 0, 0.9), 0 0 24px rgba(0, 0, 0, 0.85);
        }

        .hero-place-btn {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          user-select: none;
        }
        .hero-place-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 159, 28, 0.25) !important;
          border-color: rgba(255, 159, 28, 0.75) !important;
          box-shadow: 0 6px 18px rgba(255, 107, 53, 0.35);
        }
        .hero-place-btn.active {
          background: linear-gradient(135deg, #FF6B35, #FF9F1C) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 24px rgba(255, 107, 53, 0.55);
          transform: translateY(-2px) scale(1.05);
        }

        @media (max-width: 768px) {
          .hero-section {
            min-height: 600px !important;
            padding: 100px 0 160px !important;
          }
        }
      `}</style>

      {/* ─── FULL-BLEED SLIDESHOW WITH SWITCHABLE DEMO ANIMATION STYLES ─── */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 1
        }}
      >
        {FAMOUS_DESTINATIONS.map((dest, idx) => {
          const isActive = currentDestIdx === idx;
          const isPrev = prevDestIdxRef.current === idx;
          const stateClass = isActive ? 'active' : (isPrev ? 'prev-slide' : '');
          return (
            <div
              key={dest.id}
              className={`hero-bg-slide ${stateClass}`}
              style={{
                backgroundImage: `url(${dest.image})`
              }}
            />
          );
        })}

        {/* Soft Vignette Overlay for maximum text contrast and legibility */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(7, 15, 30, 0.42) 0%, rgba(7, 15, 30, 0.12) 45%, rgba(7, 15, 30, 0.68) 100%)',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      </div>



      {/* ─── MAIN HERO CONTENT (CLEAN, EXPANSIVE, LUXURY TYPOGRAPHY) ─── */}
      <div className="container" style={{ position: 'relative', zIndex: 3 }}>
        <div className="row align-items-center">
          
          <div className="col-12 col-lg-10 col-xl-9 text-start">
            
            <div className="text-start">
              
              {/* Dynamic Synchronized Destination Block */}
              <div className="hero-dynamic-block">
                
                {/* Eyebrow Badge */}
                <div 
                  className="d-inline-flex align-items-center gap-2 px-3.5 py-1.5 rounded-pill mb-3"
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 159, 28, 0.6)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#FF9F1C',
                      boxShadow: '0 0 10px #FF9F1C',
                      animation: 'pulseDot 1.8s infinite'
                    }}
                  />
                  <span 
                    style={{
                      color: '#FFB84D',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)'
                    }}
                  >
                    Official WOW THAILAND Platform • {activeDest.eyebrow}
                  </span>
                </div>

                {/* Headline with Typewriter Animation & CLS Phantom Sizer */}
                <h1
                  className="hero-title mb-3"
                  aria-label={fullHeadlineText}
                  style={{
                    fontSize: 'clamp(34px, 4.4vw, 56px)',
                    fontWeight: 950,
                    marginBottom: '16px',
                    lineHeight: 1.14,
                    letterSpacing: '-1.2px',
                    display: 'grid',
                    gridTemplateAreas: '"stack"',
                    position: 'relative',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {/* Phantom Sizer: invisibly reserves exact space for longest headline across all viewport sizes */}
                  <span
                    aria-hidden="true"
                    style={{
                      gridArea: 'stack',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: 0
                    }}
                  >
                    <span className="hero-title-white d-block mb-1">
                      {whitePrefix}
                    </span>
                    <span className="hero-highlight-phrase">
                      Explore Stress Free!
                    </span>
                  </span>

                  {/* Visible Typewriter Headline */}
                  <span style={{ gridArea: 'stack' }}>
                    <span 
                      className="hero-title-white d-block mb-1"
                      style={{
                        color: '#ffffff',
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 4px 25px rgba(0, 0, 0, 0.85)'
                      }}
                    >
                      {whitePrefix}
                    </span>
                    <TypewriterHighlight 
                      key={activeDest.id}
                      text={activeDest.highlightText}
                      onCycleComplete={handleCycleComplete}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </span>
                </h1>

                {/* Dynamic Destination Subtitle */}
                <p
                  className="hero-dynamic-message mb-4"
                  style={{
                    fontSize: '17px',
                    lineHeight: '1.68',
                    fontWeight: 500,
                    color: '#ffffff',
                    maxWidth: '680px',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 4px 16px rgba(0, 0, 0, 0.9), 0 0 24px rgba(0, 0, 0, 0.85)'
                  }}
                >
                  {activeDest.tagline}
                </p>

              </div>

              {/* Featured Iconic Places Quick Interactive Seek Pills */}
              <div className="mb-2">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span 
                    className="text-uppercase fw-bold" 
                    style={{ 
                      letterSpacing: '1.2px', 
                      fontSize: '11px', 
                      color: 'rgba(255, 255, 255, 0.9)',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.95)'
                    }}
                  >
                    Featured Iconic Places in Thailand
                  </span>
                  <span className="text-white-50" style={{ fontSize: '11px' }}>• Click to explore</span>
                </div>
                <div className="d-flex flex-wrap gap-2.5 align-items-center">
                  {FAMOUS_DESTINATIONS.map((dest, idx) => {
                    const isActive = currentDestIdx === idx;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => jumpToDestination(idx)}
                        className={`btn btn-sm hero-place-btn d-inline-flex align-items-center gap-2 px-3.5 py-2 rounded-pill text-white fw-bold ${isActive ? 'active' : ''}`}
                        style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, #FF6B35 0%, #FF9F1C 100%)' 
                            : 'rgba(15, 23, 42, 0.65)',
                          border: isActive 
                            ? '1.5px solid rgba(255, 255, 255, 0.6)' 
                            : '1px solid rgba(255, 255, 255, 0.25)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          fontSize: '12.5px',
                          boxShadow: isActive 
                            ? '0 8px 24px rgba(255, 107, 53, 0.55)' 
                            : '0 4px 12px rgba(0, 0, 0, 0.35)',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                          transform: isActive ? 'scale(1.05)' : 'scale(1.0)'
                        }}
                      >
                        <MapPin size={12} style={{ color: isActive ? '#ffffff' : '#FF9F1C' }} />
                        <span>{dest.shortName}</span>
                        {isActive && (
                          <span 
                            style={{ 
                              display: 'inline-block',
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%',
                              background: '#ffffff', 
                              boxShadow: '0 0 8px #ffffff' 
                            }} 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>


    </header>
  );
}
