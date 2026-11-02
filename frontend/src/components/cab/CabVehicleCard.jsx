// ========================================================================
// WOW THAILAND: Royal Siam Mobility - Transfer Option Row
// Compact Uber/Ola-style horizontal row — NO car photos, NO model names
// Shows: Service icon + Name + Capacity badges + Price + Book button
// ========================================================================

import React, { useState } from 'react';
import {
  Users, Briefcase, ShieldCheck, Check,
  ChevronDown, ChevronUp, Award, Car, Bus, Truck
} from 'lucide-react';

const TIER_META = {
  SEDAN: {
    label: 'Standard Transfer',
    tagline: 'Private sedan · Comfortable for couples & solo travellers',
    icon: Car,
    iconColor: '#4F7FD4',
    iconBg: '#EFF6FF',
    recommendedFor: 'Best for 1–3 pax'
  },
  SUV: {
    label: 'Spacious SUV Transfer',
    tagline: 'Private SUV · Extra luggage space for families',
    icon: Truck,
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    recommendedFor: 'Best for families & extra bags'
  },
  VIP_VAN: {
    label: 'VIP Group Van',
    tagline: 'Private van · Captain seats for groups & golf tours',
    icon: Bus,
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    recommendedFor: 'Best for groups up to 9'
  }
};

export default function CabVehicleCard({
  tierData,
  isSelected = false,
  onSelect,
  distanceKm = 0,
  durationMin = 0,
  targetCurrency = 'THB',
  requestedPax = 2
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!tierData) return null;

  const tierKey = (tierData.tier || 'SEDAN').toUpperCase();
  const meta = TIER_META[tierKey] || TIER_META.SEDAN;
  const IconComponent = meta.icon;

  const fareThb = Number(tierData.fareThb || 0);
  const displayFare = Number(tierData.displayFare || fareThb);
  const symbol = tierData.symbol || '฿';
  const curr = tierData.currency || 'THB';
  const breakdown = tierData.breakdown || {};

  const isRecommended =
    (requestedPax <= 3 && tierKey === 'SEDAN') ||
    (requestedPax === 4 && tierKey === 'SUV') ||
    (requestedPax >= 5 && tierKey === 'VIP_VAN');

  return (
    <div
      className="rounded-4 border overflow-hidden transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: isSelected ? '#D4AF37' : (isRecommended ? '#D4AF37' : '#E2E8F0'),
        borderWidth: (isSelected || isRecommended) ? '2px' : '1px',
        boxShadow: isSelected
          ? '0 6px 20px rgba(212, 175, 55, 0.2)'
          : isRecommended
          ? '0 4px 14px rgba(212, 175, 55, 0.12)'
          : '0 1px 4px rgba(0,0,0,0.06)'
      }}
    >
      {/* ── Main Row ─────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-3 p-3">

        {/* Icon Block */}
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: '52px',
            height: '52px',
            backgroundColor: meta.iconBg
          }}
        >
          <IconComponent size={26} color={meta.iconColor} strokeWidth={1.8} />
        </div>

        {/* Service Name + Tagline + Badges */}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-0.5">
            <span className="fw-black text-dark" style={{ fontSize: '1rem' }}>
              {meta.label}
            </span>
            {isRecommended && (
              <span
                className="badge rounded-pill d-inline-flex align-items-center gap-1 fw-bold"
                style={{ backgroundColor: '#D4AF37', color: '#0B132B', fontSize: '0.68rem' }}
              >
                <Award size={10} />
                Best Match
              </span>
            )}
            {isSelected && (
              <span
                className="badge rounded-pill d-inline-flex align-items-center gap-1 fw-bold"
                style={{ backgroundColor: '#0B132B', color: '#D4AF37', fontSize: '0.68rem' }}
              >
                <Check size={10} />
                Selected
              </span>
            )}
          </div>

          <div className="text-muted small mb-1.5" style={{ fontSize: '0.78rem' }}>
            {meta.tagline}
          </div>

          {/* Capacity Badges */}
          <div className="d-flex flex-wrap align-items-center gap-1.5">
            <span
              className="badge rounded-pill d-inline-flex align-items-center gap-1 border"
              style={{ backgroundColor: '#F8FAFC', color: '#374151', borderColor: '#E5E7EB', fontSize: '0.72rem' }}
            >
              <Users size={11} className="text-primary" />
              {tierData.maxPax || 3} Pax
            </span>
            <span
              className="badge rounded-pill d-inline-flex align-items-center gap-1 border"
              style={{ backgroundColor: '#F8FAFC', color: '#374151', borderColor: '#E5E7EB', fontSize: '0.72rem' }}
            >
              <Briefcase size={11} className="text-secondary" />
              {tierData.maxLuggage || 2} Bags
            </span>
            <span
              className="badge rounded-pill d-inline-flex align-items-center gap-1 border"
              style={{ backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0', fontSize: '0.72rem' }}
            >
              <ShieldCheck size={11} />
              Tolls & Meet & Greet
            </span>
          </div>
        </div>

        {/* Price + Book */}
        <div className="d-flex flex-column align-items-end flex-shrink-0 text-end">
          <div className="fw-black text-dark font-heading" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
            {symbol} {displayFare.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-muted mb-2" style={{ fontSize: '0.68rem' }}>
            {curr} · All-inclusive
          </div>
          {curr !== 'THB' && (
            <div className="text-muted mb-2" style={{ fontSize: '0.68rem' }}>
              ฿{fareThb.toLocaleString('en-US')} THB
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelect && onSelect(tierData)}
            className="btn rounded-3 fw-bold d-flex align-items-center gap-1.5"
            style={{
              backgroundColor: isSelected ? '#0B132B' : '#D4AF37',
              color: isSelected ? '#F1D78A' : '#0B132B',
              borderColor: isSelected ? '#0B132B' : '#D4AF37',
              fontSize: '0.82rem',
              padding: '6px 14px',
              whiteSpace: 'nowrap'
            }}
          >
            {isSelected ? (
              <>
                <Check size={14} />
                <span>Booked</span>
              </>
            ) : (
              <span>Book Transfer</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Breakdown Toggle Strip ───────────────────────────────────── */}
      <div
        className="border-top d-flex align-items-center justify-content-between px-3 py-1.5"
        style={{ backgroundColor: '#F8FAFC', fontSize: '0.73rem', cursor: 'pointer' }}
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <span className="text-muted">View fare breakdown</span>
        {showBreakdown ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
      </div>

      {/* ── Fare Breakdown Panel ─────────────────────────────────────── */}
      {showBreakdown && (
        <div
          className="px-3 py-2 border-top small"
          style={{ backgroundColor: '#FFFBEB', fontSize: '0.76rem' }}
        >
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Chauffeur base allowance</span>
            <span className="fw-bold">฿{breakdown.baseFareThb || 0} THB</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">
              Distance ({distanceKm} km × ฿{breakdown.perKmRateThb || 0}/km)
            </span>
            <span className="fw-bold">฿{breakdown.distanceFareThb || 0} THB</span>
          </div>
          <div className="d-flex justify-content-between mb-1 text-success">
            <span>Expressway tolls & airport parking</span>
            <span className="fw-bold">฿0 Included</span>
          </div>
          <div className="d-flex justify-content-between pt-1 border-top fw-black text-dark">
            <span>Total guaranteed fare</span>
            <span>฿{fareThb} THB</span>
          </div>
        </div>
      )}
    </div>
  );
}
