// ========================================================================
// WOW THAILAND: Location Autocomplete Input Component
// Autocomplete dropdown covering Thailand hubs, airports, hotels, and piers
// ========================================================================

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Search, Check, X, Plane, Building } from 'lucide-react';
import { THAILAND_HUBS } from './CabSearchWidget';

export default function ThailandLocationAutocomplete({
  value,
  onChange,
  placeholder = 'Enter Thailand location...',
  isPickup = true,
  onSelect = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = THAILAND_HUBS.filter(h =>
    !value ||
    h.name.toLowerCase().includes(value.toLowerCase()) ||
    h.city.toLowerCase().includes(value.toLowerCase()) ||
    h.tag.toLowerCase().includes(value.toLowerCase())
  );

  const handleSelect = (name) => {
    onChange(name);
    setIsOpen(false);
    if (onSelect) onSelect(name);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 32px 10px 12px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            backgroundColor: '#F8FAFC',
            border: isOpen ? '1.5px solid #D4AF37' : '1px solid #E2E8F0',
            borderRadius: '10px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(true); }}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#9CA3AF'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#FFFFFF',
            border: '1px solid #D4AF37',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {value && value.trim() && (
            <div
              onClick={() => handleSelect(value.trim())}
              style={{
                padding: '8px 10px',
                marginBottom: '4px',
                borderRadius: '8px',
                background: '#FEF9C3',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#854D0E'
              }}
            >
              <MapPin size={14} className="text-warning flex-shrink-0" />
              <span className="text-truncate">Use &ldquo;{value.trim()}&rdquo;</span>
            </div>
          )}

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', padding: '4px 8px', textTransform: 'uppercase' }}>
            Popular Thailand Hubs
          </div>

          {filtered.slice(0, 7).map(hub => (
            <div
              key={hub.id}
              onClick={() => handleSelect(hub.name)}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: value === hub.name ? '#F1F5F9' : 'transparent',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={(e) => e.currentTarget.style.background = value === hub.name ? '#F1F5F9' : 'transparent'}
            >
              <div style={{ minWidth: 0, marginRight: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hub.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {hub.city} · {hub.tag}
                </div>
              </div>
              {value === hub.name && <Check size={14} color="#D4AF37" style={{ flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
