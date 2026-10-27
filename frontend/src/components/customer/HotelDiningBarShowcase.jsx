import React, { useState, useMemo } from 'react';
import {
  Wine, Utensils, Clock, ShieldCheck, Sparkles, Check,
  ChevronRight, ChevronDown, ChevronUp, Coffee, Sun, Moon, Info, Eye, Image as ImageIcon
} from 'lucide-react';

export default function HotelDiningBarShowcase({
  barLounge,
  menuItems = [],
  onOpenPhotoLightbox
}) {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState('all');
  const [dietFilter, setDietFilter] = useState('all'); // 'all' | 'veg' | 'non_veg' | 'jain'

  // Extract bar features
  const barFeatures = useMemo(() => {
    if (!barLounge) return [];
    if (Array.isArray(barLounge.features)) return barLounge.features;
    if (barLounge.features_json) {
      try {
        const parsed = typeof barLounge.features_json === 'string' ? JSON.parse(barLounge.features_json) : barLounge.features_json;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, [barLounge]);

  // Extract bar images
  const barImages = useMemo(() => {
    if (!barLounge) return [];
    const imgs = [];
    if (barLounge.cover_image) imgs.push(barLounge.cover_image);
    if (Array.isArray(barLounge.images)) {
      barLounge.images.forEach(img => {
        if (!imgs.includes(img)) imgs.push(img);
      });
    } else if (barLounge.images_json) {
      try {
        const parsed = typeof barLounge.images_json === 'string' ? JSON.parse(barLounge.images_json) : barLounge.images_json;
        if (Array.isArray(parsed)) {
          parsed.forEach(img => {
            if (!imgs.includes(img)) imgs.push(img);
          });
        }
      } catch (e) {}
    }
    return imgs.filter(Boolean);
  }, [barLounge]);

  // Extract menu categories dynamically
  const menuCategories = useMemo(() => {
    const cats = new Set();
    menuItems.forEach(item => {
      const c = item.category_name || item.category;
      if (c) cats.add(c);
    });
    return Array.from(cats);
  }, [menuItems]);

  // Filter menu items by category and diet
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // Category filter
      const itemCat = item.category_name || item.category;
      if (activeMenuCategory !== 'all' && itemCat !== activeMenuCategory) {
        return false;
      }
      // Diet filter
      if (dietFilter === 'veg' && !item.is_veg) return false;
      if (dietFilter === 'non_veg' && item.is_veg) return false;
      if (dietFilter === 'jain' && !item.is_jain) return false;
      return true;
    });
  }, [menuItems, activeMenuCategory, dietFilter]);

  const hasBar = Boolean(barLounge && (barLounge.name || barImages.length > 0));
  const hasMenu = Boolean(menuItems && menuItems.length > 0);

  if (!hasBar && !hasMenu) {
    return null;
  }

  return (
    <div id="dining-bar" className="mb-5 pt-3">
      {/* Section Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <span className="badge bg-warning bg-opacity-20 text-warning text-xs font-monospace px-2.5 py-1 rounded-pill mb-1 d-inline-flex align-items-center gap-1">
            <Sparkles size={12} /> ON-SITE CULINARY EXPERIENCE
          </span>
          <h3 className="fw-black text-dark mb-0 font-heading" style={{ fontSize: '1.6rem', letterSpacing: '-0.4px' }}>
            Dining, Bar &amp; Lounges
          </h3>
          <p className="text-muted text-xs mb-0 mt-1">
            Explore authentic Thai delicacies, chef-curated menus, and sunset cocktail lounges.
          </p>
        </div>
      </div>

      {/* Bar & Lounge Card (if available) */}
      {hasBar && (
        <div className="bg-white rounded-4 border p-4 shadow-sm mb-4 transition-all" style={{ borderColor: '#E2E8F0' }}>
          <div className="row g-4 align-items-center">
            {/* Bar Cover Image / Carousel */}
            <div className="col-12 col-lg-5">
              <div
                className="position-relative rounded-3 overflow-hidden shadow-sm border"
                style={{ height: '260px', background: '#0D1B2E', cursor: barImages.length > 0 ? 'pointer' : 'default' }}
                onClick={() => {
                  if (barImages.length > 0 && onOpenPhotoLightbox) {
                    onOpenPhotoLightbox(barImages[0]);
                  }
                }}
              >
                {barImages.length > 0 ? (
                  <img
                    src={barImages[0]}
                    alt={barLounge.name || 'Bar & Lounge'}
                    className="w-100 h-100 object-fit-cover transition-all"
                    style={{ filter: 'brightness(0.92)' }}
                  />
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-white opacity-60">
                    <Wine size={42} className="mb-2" />
                    <span className="text-xs">Bar &amp; Lounge</span>
                  </div>
                )}

                {/* Floating Tags */}
                <div className="position-absolute top-0 start-0 m-3 d-flex flex-column gap-1">
                  <span className="badge bg-dark bg-opacity-80 text-white rounded-pill px-2.5 py-1 text-xxs d-inline-flex align-items-center gap-1 shadow-sm">
                    <Wine size={12} className="text-warning" /> Signature Lounge
                  </span>
                </div>

                {barImages.length > 1 && (
                  <div className="position-absolute bottom-0 end-0 m-3">
                    <span className="badge bg-black bg-opacity-75 text-white rounded-pill px-2.5 py-1 text-xxs d-inline-flex align-items-center gap-1 shadow-sm">
                      <ImageIcon size={12} /> {barImages.length} Photos
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bar Info & Details */}
            <div className="col-12 col-lg-7">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <h4 className="fw-black text-dark mb-0 font-heading fs-4">
                  {barLounge.name || 'Rooftop Bar & Lounge'}
                </h4>
                {(barLounge.timing_open || barLounge.timing_close) && (
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-pill text-xs d-inline-flex align-items-center gap-1.5 font-monospace">
                    <Clock size={13} className="text-warning" />
                    {barLounge.timing_open || '04:00 PM'} – {barLounge.timing_close || '01:00 AM'}
                  </span>
                )}
              </div>

              {barLounge.description && (
                <p className="text-muted text-xs lh-base mb-3">
                  {barLounge.description}
                </p>
              )}

              {/* Entry Policy */}
              {barLounge.entry_policy && (
                <div className="p-2.5 rounded-3 bg-light border mb-3 d-flex align-items-center gap-2 text-xs">
                  <ShieldCheck size={16} className="text-primary flex-shrink-0" />
                  <div>
                    <span className="text-muted fw-bold d-block text-xxs text-uppercase">Entry Policy:</span>
                    <span className="text-dark fw-medium">{barLounge.entry_policy}</span>
                  </div>
                </div>
              )}

              {/* Bar Features Chips */}
              {barFeatures.length > 0 && (
                <div>
                  <span className="text-muted fw-bold text-xxs text-uppercase d-block mb-1.5 tracking-wider">
                    Bar Highlights &amp; Facilities:
                  </span>
                  <div className="d-flex flex-wrap gap-1.5">
                    {barFeatures.map((feat, idx) => (
                      <span
                        key={idx}
                        className="badge bg-white text-dark border px-2.5 py-1 rounded-pill text-xxs shadow-xs d-inline-flex align-items-center gap-1"
                      >
                        <Sparkles size={11} className="text-warning" /> {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restaurant & Food Menu Showcase (if available) */}
      {hasMenu && (
        <div className="bg-white rounded-4 border p-4 shadow-sm" style={{ borderColor: '#E2E8F0' }}>
          {/* Header Bar */}
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 pb-2 border-bottom">
            <div className="d-flex align-items-center gap-2.5">
              <div className="p-2.5 rounded-3 bg-light text-warning d-flex align-items-center justify-content-center">
                <Utensils size={20} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="fw-black text-dark mb-0 font-heading" style={{ fontSize: '1.15rem' }}>
                    Restaurant &amp; In-Room Dining
                  </h5>
                  <span className="badge bg-dark text-white rounded-pill px-2.5 py-0.5 text-xxs font-monospace">
                    {menuItems.length} Dishes
                  </span>
                </div>
                <span className="text-muted text-xs">
                  Authentic Thai coastal specialties, continental breakfast spreads &amp; room service
                </span>
              </div>
            </div>

            {/* Action Buttons: Diet Filter & Expand / Collapse Toggle */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Diet Filters: All | Veg | Non-Veg | Jain */}
              <div className="btn-group btn-group-sm p-1 rounded-pill bg-light border shadow-xs">
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold border-0 transition-all text-xs ${dietFilter === 'all' ? 'bg-dark text-white shadow-sm' : 'text-muted'}`}
                  onClick={() => {
                    setDietFilter('all');
                    setIsMenuExpanded(true);
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold border-0 transition-all text-xs d-inline-flex align-items-center gap-1 ${dietFilter === 'veg' ? 'bg-success text-white shadow-sm' : 'text-success'}`}
                  onClick={() => {
                    setDietFilter('veg');
                    setIsMenuExpanded(true);
                  }}
                >
                  🟢 Veg
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold border-0 transition-all text-xs d-inline-flex align-items-center gap-1 ${dietFilter === 'non_veg' ? 'bg-danger text-white shadow-sm' : 'text-danger'}`}
                  onClick={() => {
                    setDietFilter('non_veg');
                    setIsMenuExpanded(true);
                  }}
                >
                  🔴 Non-Veg
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold border-0 transition-all text-xs d-inline-flex align-items-center gap-1 ${dietFilter === 'jain' ? 'bg-warning text-dark shadow-sm' : 'text-warning'}`}
                  onClick={() => {
                    setDietFilter('jain');
                    setIsMenuExpanded(true);
                  }}
                >
                  🟡 Jain
                </button>
              </div>

              {/* Main Expand / Collapse Button */}
              <button
                type="button"
                onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-bold text-xs d-inline-flex align-items-center gap-1.5 shadow-sm transition-all ${
                  isMenuExpanded ? 'btn-outline-secondary' : 'btn-warning text-dark'
                }`}
              >
                {isMenuExpanded ? (
                  <>
                    <span>Hide Menu</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <Utensils size={13} />
                    <span>View Menu &amp; Prices ({menuItems.length})</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsed State: Clean Overview Highlights */}
          {!isMenuExpanded && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 text-xs">
              <div className="d-flex align-items-center gap-3 flex-wrap text-muted">
                <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                  <Check size={14} className="text-success" /> Multi-Cuisine Menu
                </span>
                <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                  <Check size={14} className="text-success" /> Breakfast Buffets &amp; À La Carte
                </span>
                <span className="d-inline-flex align-items-center gap-1 text-dark fw-medium">
                  <Check size={14} className="text-success" /> Room Service Available
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuExpanded(true)}
                className="btn btn-link p-0 text-primary text-xs fw-bold text-decoration-none d-inline-flex align-items-center gap-1"
              >
                <span>Browse all {menuItems.length} dishes &amp; pricing</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Expanded State: Category Chips + Dish Cards Grid */}
          {isMenuExpanded && (
            <div className="pt-3 animate-fade-in">
              {/* Category Filter Chips */}
              {menuCategories.length > 1 && (
                <div className="d-flex flex-wrap gap-1.5 mb-3">
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1 border transition-all text-xs fw-semibold ${activeMenuCategory === 'all' ? 'btn-dark text-white shadow-xs' : 'bg-light text-muted border-slate-200'}`}
                    onClick={() => setActiveMenuCategory('all')}
                  >
                    All Categories ({menuItems.length})
                  </button>
                  {menuCategories.map(cat => {
                    const countInCat = menuItems.filter(i => (i.category_name || i.category) === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 py-1 border transition-all text-xs fw-semibold d-inline-flex align-items-center gap-1 ${activeMenuCategory === cat ? 'btn-dark text-white shadow-xs' : 'bg-light text-muted border-slate-200'}`}
                        onClick={() => setActiveMenuCategory(cat)}
                      >
                        {cat}
                        <span className="badge rounded-pill text-xxs bg-white text-dark opacity-80">
                          {countInCat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dish Cards Grid */}
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-4 text-muted text-xs">
                  No dishes match your selected filter.
                </div>
              ) : (
                <div className="row g-3">
                  {filteredMenuItems.map(dish => {
                    const isVeg = Boolean(dish.is_veg);
                    const isJain = Boolean(dish.is_jain);
                    const isAvailable = dish.is_available !== 0;

                    return (
                      <div key={dish.id} className="col-12 col-md-6">
                        <div
                          className="p-3 rounded-3 border bg-light d-flex align-items-start justify-content-between gap-3 h-100 transition-all hover-border-slate-300"
                          style={{ borderColor: '#f1f5f9' }}
                        >
                          <div className="d-flex flex-column flex-grow-1">
                            {/* Diet icon + Category */}
                            <div className="d-flex align-items-center gap-1.5 mb-1">
                              <span
                                className="d-inline-flex align-items-center justify-content-center border rounded-1 p-0.5"
                                style={{
                                  width: '15px',
                                  height: '15px',
                                  borderColor: isVeg ? '#22c55e' : '#ef4444'
                                }}
                                title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                              >
                                <span
                                  className="rounded-circle"
                                  style={{
                                    width: '7px',
                                    height: '7px',
                                    background: isVeg ? '#22c55e' : '#ef4444'
                                  }}
                                />
                              </span>

                              {isJain && (
                                <span className="badge bg-warning bg-opacity-20 text-warning text-xxs px-1.5 py-0.5 rounded">
                                  Jain Option
                                </span>
                              )}

                              <span className="text-muted text-xxs text-uppercase fw-semibold font-monospace">
                                {dish.category_name || dish.category}
                              </span>
                            </div>

                            {/* Dish Name */}
                            <h6 className="fw-bold text-dark mb-1 text-sm font-heading">
                              {dish.name}
                            </h6>

                            {/* Description */}
                            {dish.description && (
                              <p className="text-muted text-xs lh-sm mb-2" style={{ fontSize: '0.76rem' }}>
                                {dish.description}
                              </p>
                            )}

                            {/* Price & Availability */}
                            <div className="d-flex align-items-baseline gap-2 mt-auto">
                              <span className="fw-black text-dark font-heading fs-6">
                                ฿{parseFloat(dish.price || 0).toLocaleString('en-US')}
                              </span>
                              {!isAvailable && (
                                <span className="badge bg-danger bg-opacity-10 text-danger text-xxs rounded-pill">
                                  Sold Out Today
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dish Photo Thumbnail (if provided) */}
                          {dish.image_url && (
                            <div
                              className="rounded-3 overflow-hidden flex-shrink-0 border shadow-xs"
                              style={{ width: '82px', height: '82px', background: '#fff', cursor: 'pointer' }}
                              onClick={() => {
                                if (onOpenPhotoLightbox) onOpenPhotoLightbox(dish.image_url);
                              }}
                            >
                              <img
                                src={dish.image_url}
                                alt={dish.name}
                                className="w-100 h-100 object-fit-cover hover-scale transition-all"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Collapse Helper */}
              <div className="text-center mt-3 pt-2 border-top">
                <button
                  type="button"
                  onClick={() => setIsMenuExpanded(false)}
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1 text-xs fw-semibold d-inline-flex align-items-center gap-1"
                >
                  <ChevronUp size={13} />
                  <span>Collapse Menu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
