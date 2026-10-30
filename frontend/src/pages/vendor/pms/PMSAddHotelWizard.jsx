import React, { useState, useEffect } from 'react';
import {
  Building, MapPin, Phone, Mail, Globe, FileText, ChevronRight,
  ChevronLeft, Check, Save, Star, Upload, Wifi, Car, Dumbbell,
  Waves, Wind, Zap, Camera, Coffee, Shield, AlertCircle, BedDouble,
  Eye, Trash2, FileCheck, Wine, Plus, Edit2, Sparkles, Clock,
  CheckCircle, X, Users, DollarSign, Image as ImageIcon, Layers, RefreshCw
} from 'lucide-react';
import {
  uploadImage, addMasterHotel, updateHotel, pmsCreateRoomType,
  pmsCreateRoom, pmsListRoomTypes, pmsSaveBarLounge, pmsGetBarLounge,
  pmsSyncRoomMealPlans
} from '../../../services/api';

const STEPS = [
  { num: 1, label: 'Basic Information' },
  { num: 2, label: 'Location' },
  { num: 3, label: 'Images & Media' },
  { num: 4, label: 'Facilities & Bar' },
  { num: 5, label: 'Policies' },
  { num: 6, label: 'Room Setup' },
  { num: 7, label: 'Room Numbers' },
  { num: 8, label: 'Pricing' },
  { num: 9, label: 'Documents' },
  { num: 10, label: 'Review & Submit' }
];

const REQUIRED_DOCUMENTS = [
  { id: 'prop_reg', label: 'Property Registration Document', required: true },
  { id: 'biz_reg', label: 'Business Registration', required: true },
  { id: 'gst_cert', label: 'GST Certificate', required: false },
  { id: 'pan_doc', label: 'PAN Document', required: true },
  { id: 'bank_proof', label: 'Bank Proof / Cancelled Cheque', required: true },
  { id: 'owner_id', label: 'Owner ID Proof (Aadhaar / Passport)', required: true },
  { id: 'fire_safety', label: 'Fire Safety Certificate', required: false }
];

const PROPERTY_TYPES = ['Hotel', 'Resort', 'Villa', 'Apartment', 'Homestay', 'Hostel', 'Guest House', 'Boutique Hotel', 'Service Apartment', 'Cottage'];

const FACILITIES_LIST = [
  { cat: 'Internet & Tech', items: ['Free Wi-Fi', 'Business Centre', 'Conference Hall'] },
  { cat: 'Transport', items: ['Parking', 'Airport Transfer', 'Valet Parking'] },
  { cat: 'Recreation', items: ['Swimming Pool', 'Gym', 'Spa', 'Garden', 'Terrace'] },
  { cat: 'Services', items: ['24-Hour Reception', 'Laundry Service', 'Luggage Storage', 'Travel Desk', 'Room Service'] },
  { cat: 'Safety', items: ['CCTV', 'Fire Safety Equipment', 'First Aid'] },
  { cat: 'Accessibility', items: ['Lift', 'Wheelchair Access', 'Ramp'] },
  { cat: 'Events', items: ['Banquet Hall', 'Outdoor Event Space'] },
  { cat: 'Dining & Nightlife', items: ['Power Backup', 'Air Conditioning', 'Restaurant (On-site)', 'Bar'] }
];

const STANDARD_ROOM_AMENITIES = [
  'Free Wi-Fi', 'Air Conditioning', 'Television / Smart TV', 'Electric Kettle',
  'Private Bathroom', 'Balcony / Terrace', 'Mini Bar / Mini Fridge', 'Safety Deposit Box',
  'Tea / Coffee Maker', 'Hair Dryer', 'Complimentary Toiletries', 'Hot & Cold Water',
  'Work Desk & Chair', 'Wardrobe & Hangers', 'Iron & Ironing Board', 'Room Service'
];

const BED_TYPES = ['King', 'Queen', 'Twin', 'Single', 'Double', 'Bunk', 'Sofa Bed'];
const VIEW_TYPES = ['Garden View', 'Sea View', 'Pool View', 'City View', 'Mountain View', 'Courtyard View', 'No View'];

const BAR_FEATURE_OPTIONS = [
  'Sea View', 'Sunset Deck', 'Live DJ', 'Signature Cocktails',
  'Craft Beer', 'Finger Food & Tapas', 'Outdoor Seating', 'AC Indoor Lounge',
  'Live Music', 'Poolside', 'Happy Hours'
];

const QUICK_ROOM_PRESETS = [
  {
    name: 'Deluxe King Room',
    internal_code: 'DLX-KNG',
    total_rooms: 5,
    bed_type: 'King',
    num_beds: 1,
    max_adults: 2,
    max_children: 1,
    max_occupancy: 3,
    room_size: '350',
    view_type: 'Garden View',
    base_price: 4000,
    selling_price: 4500,
    weekend_price: 5500,
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Television / Smart TV', 'Electric Kettle', 'Private Bathroom', 'Complimentary Toiletries'],
    images: []
  },
  {
    name: 'Executive Sea View Suite',
    internal_code: 'EXE-SUI',
    total_rooms: 3,
    bed_type: 'King',
    num_beds: 1,
    max_adults: 2,
    max_children: 2,
    max_occupancy: 4,
    room_size: '520',
    view_type: 'Sea View',
    base_price: 7000,
    selling_price: 7800,
    weekend_price: 9000,
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Television / Smart TV', 'Balcony / Terrace', 'Mini Bar / Mini Fridge', 'Electric Kettle', 'Private Bathroom', 'Safety Deposit Box'],
    images: []
  },
  {
    name: 'Superior Garden Villa',
    internal_code: 'SUP-VIL',
    total_rooms: 2,
    bed_type: 'King',
    num_beds: 2,
    max_adults: 4,
    max_children: 2,
    max_occupancy: 6,
    room_size: '750',
    view_type: 'Garden View',
    base_price: 8500,
    selling_price: 9500,
    weekend_price: 11000,
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'Television / Smart TV', 'Balcony / Terrace', 'Mini Bar / Mini Fridge', 'Electric Kettle', 'Private Bathroom', 'Work Desk & Chair'],
    images: []
  }
];

const createEmptyRoom = () => ({
  temp_id: 'rt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
  name: '',
  internal_code: '',
  description: '',
  total_rooms: 5,
  max_adults: 2,
  max_children: 1,
  max_occupancy: 3,
  base_occupancy: 2,
  bed_type: 'King',
  num_beds: 1,
  room_size: '350',
  room_size_unit: 'sqft',
  view_type: 'Garden View',
  smoking: false,
  air_conditioned: true,
  private_bathroom: true,
  extra_bed_available: false,
  base_price: 4000,
  selling_price: 4500,
  weekend_price: 5500,
  extra_adult_charge: 1000,
  extra_child_charge: 500,
  extra_bed_charge: 800,
  amenities: ['Free Wi-Fi', 'Air Conditioning', 'Television / Smart TV', 'Electric Kettle', 'Private Bathroom'],
  images: []
});

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between mb-1">
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>Step {current} of {total}</span>
        <span className="fw-bold" style={{ fontSize: '0.78rem', color: '#0D1B2E' }}>{pct}% complete</span>
      </div>
      <div className="rounded-pill overflow-hidden" style={{ height: '6px', background: '#dee2e6' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #0D1B2E, #FF6333)', transition: 'width 0.4s' }}></div>
      </div>
      <div className="d-flex gap-1 mt-3 flex-wrap">
        {STEPS.map(s => (
          <div key={s.num} className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{
              width: '22px', height: '22px',
              background: s.num < current ? '#00b894' : s.num === current ? '#0D1B2E' : '#dee2e6',
              color: s.num <= current ? '#fff' : '#6c757d',
              fontWeight: 700, fontSize: '0.68rem', flexShrink: 0
            }}>
              {s.num < current ? <Check size={11} /> : s.num}
            </div>
            <span className="d-none d-md-inline" style={{ color: s.num === current ? '#0D1B2E' : s.num < current ? '#00b894' : '#adb5bd', fontWeight: s.num === current ? 700 : 400 }}>{s.label}</span>
            {s.num < STEPS.length && <ChevronRight size={10} className="text-muted d-none d-md-inline" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FacilitiesSelector({ selected, onChange }) {
  const toggle = (f) => {
    if (selected.includes(f)) onChange(selected.filter(x => x !== f));
    else onChange([...selected, f]);
  };
  return (
    <div>
      {FACILITIES_LIST.map(cat => (
        <div key={cat.cat} className="mb-4">
          <h6 className="fw-bold mb-3" style={{ color: '#1a2b4a', fontSize: '0.85rem' }}>{cat.cat}</h6>
          <div className="d-flex flex-wrap gap-2">
            {cat.items.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                className="btn btn-sm rounded-pill px-3 py-1"
                style={{
                  border: '1px solid',
                  borderColor: selected.includes(item) ? '#0D1B2E' : '#dee2e6',
                  background: selected.includes(item) ? '#0D1B2E' : '#fff',
                  color: selected.includes(item) ? '#fff' : '#495057',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s'
                }}
              >
                {selected.includes(item) && <Check size={11} className="me-1" />}
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PMSAddHotelWizard({ currentUser, onAddHotel, onUpdateHotel, vendorHotels, editingHotelId, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingStatusMsg, setSavingStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState({});
  const [createdHotelId, setCreatedHotelId] = useState(editingHotelId || null);

  // Room modal state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomIndex, setEditingRoomIndex] = useState(null);
  const [roomModalForm, setRoomModalForm] = useState(createEmptyRoom());
  const [roomUrlInput, setRoomUrlInput] = useState('');
  const [customRoomAmenity, setCustomRoomAmenity] = useState('');
  const [uploadingRoomImages, setUploadingRoomImages] = useState(false);

  // Bar profile inputs
  const [customBarFeature, setCustomBarFeature] = useState('');
  const [barUrlInput, setBarUrlInput] = useState('');
  const [uploadingBarImage, setUploadingBarImage] = useState(false);

  // Main Form state
  const [form, setForm] = useState({
    name: '', property_type: 'Hotel', stars: '3', short_description: '', description: '',
    year_established: '', total_rooms: '', floors: '', phone: '', reservation_phone: '',
    email: '', website: '', property_registration_no: '', gst_number: '',
    // Location
    country: 'Thailand', state: 'Bangkok', city: 'Bangkok', area: '', address: '',
    pincode: '', landmark: '', latitude: '', longitude: '',
    // Images
    images: [], image_urls: '', cover_image: '',
    // Facilities & Bar
    facilities: [],
    has_bar: false,
    bar_name: '',
    bar_timing_open: '04:00 PM',
    bar_timing_close: '01:00 AM',
    bar_entry_policy: 'Free Entry for Hotel Guests & Couples',
    bar_description: '',
    bar_features: ['Sea View', 'Signature Cocktails', 'Live DJ'],
    bar_images: [],
    bar_cover_image: '',
    bar_is_active: 1,
    // Policies
    checkin_time: '14:00', checkout_time: '12:00', cancellation_policy: '',
    child_policy: '', smoking_policy: 'Non-Smoking Property', pet_policy: 'No Pets Allowed',
    unmarried_couple_policy: 'Allowed', property_rules: '',
    // Rooms & Inventory
    room_types: [],
    room_numbers: {}, // { [rtKey]: [ { number: '101', floor: '1', status: 'Available' } ] }
    // Pricing
    base_price: '', selling_price: '', weekend_price: '',
    // Documents
    documents: {}
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-save form progress to localStorage on any change (preserves Steps 1-10 even upon errors)
  useEffect(() => {
    if (!editingHotelId && form.name) {
      try {
        localStorage.setItem('pms_wizard_hotel_draft', JSON.stringify({ form, step, savedAt: Date.now() }));
      } catch (e) {}
    }
  }, [form, step, editingHotelId]);

  // Restore draft on mount if available
  useEffect(() => {
    if (!editingHotelId) {
      try {
        const savedDraft = localStorage.getItem('pms_wizard_hotel_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.form && parsed.form.name) {
            setForm(parsed.form);
            if (parsed.step && parsed.step > 1) {
              setStep(parsed.step);
            }
          }
        }
      } catch (e) {}
    }
  }, [editingHotelId]);

  // Load existing data if editing
  useEffect(() => {
    if (editingHotelId) {
      if (vendorHotels) {
        const existing = vendorHotels.find(h => h.id === editingHotelId);
        if (existing) {
          setForm(f => ({
            ...f,
            name: existing.name || '',
            property_type: existing.property_type || 'Hotel',
            stars: existing.stars || '3',
            description: existing.description || '',
            phone: existing.phone || '',
            email: existing.email || '',
            website: existing.website || '',
            country: existing.country || 'Thailand',
            state: existing.state || 'Thailand',
            city: existing.city || 'Bangkok',
            area: existing.location || '',
            address: existing.address || '',
            pincode: existing.pincode || '',
            images: (() => { try { return existing.images_json ? JSON.parse(existing.images_json) : []; } catch { return []; } })(),
            facilities: existing.amenities ? existing.amenities.split(',').map(s => s.trim()) : [],
            checkin_time: existing.checkin_time || '14:00',
            checkout_time: existing.checkout_time || '12:00',
            base_price: existing.price || '',
            documents: (() => { try { return existing.documents_json ? JSON.parse(existing.documents_json) : {}; } catch { return {}; } })()
          }));
          setStep(existing.wizard_step || 1);
        }
      }

      // Fetch existing room types and bar lounge for this hotel
      (async () => {
        try {
          const rtRes = await pmsListRoomTypes(currentUser?.id || 'u-5', editingHotelId);
          if (rtRes && Array.isArray(rtRes.room_types)) {
            const formattedRooms = rtRes.room_types.map(r => ({
              id: r.id,
              temp_id: r.id,
              name: r.name,
              internal_code: r.internal_code || '',
              description: r.description || '',
              total_rooms: r.total_rooms || 1,
              max_adults: r.max_adults || 2,
              max_children: r.max_children || 1,
              max_occupancy: r.max_occupancy || 3,
              base_occupancy: r.base_occupancy || 2,
              bed_type: r.bed_type || 'King',
              num_beds: r.num_beds || 1,
              room_size: r.room_size || '350',
              room_size_unit: r.room_size_unit || 'sqft',
              view_type: r.view_type || 'Garden View',
              smoking: !!r.smoking,
              air_conditioned: !!r.air_conditioned,
              private_bathroom: !!r.private_bathroom,
              extra_bed_available: !!r.extra_bed_available,
              base_price: r.base_price || 4000,
              selling_price: r.selling_price || 4500,
              weekend_price: r.weekend_price || 5500,
              extra_adult_charge: r.extra_adult_charge || 1000,
              extra_child_charge: r.extra_child_charge || 500,
              extra_bed_charge: r.extra_bed_charge || 800,
              amenities: (() => { try { return Array.isArray(r.amenities_json) ? r.amenities_json : JSON.parse(r.amenities_json || '[]'); } catch { return []; } })(),
              images: (() => { try { return Array.isArray(r.images_json) ? r.images_json : JSON.parse(r.images_json || '[]'); } catch { return []; } })()
            }));
            set('room_types', formattedRooms);
          }
        } catch (e) {
          console.warn('Could not fetch existing room types:', e);
        }

        try {
          const barRes = await pmsGetBarLounge(editingHotelId);
          if (barRes && barRes.success && barRes.bar) {
            const b = barRes.bar;
            setForm(f => ({
              ...f,
              has_bar: true,
              bar_name: b.name || '',
              bar_timing_open: b.timing_open || '04:00 PM',
              bar_timing_close: b.timing_close || '01:00 AM',
              bar_entry_policy: b.entry_policy || 'Free Entry for Hotel Guests & Couples',
              bar_description: b.description || '',
              bar_features: Array.isArray(b.features) ? b.features : [],
              bar_images: Array.isArray(b.images) ? b.images : [],
              bar_cover_image: b.cover_image || (Array.isArray(b.images) && b.images[0]) || '',
              bar_is_active: b.is_active !== undefined ? parseInt(b.is_active) : 1
            }));
          }
        } catch (e) {
          console.warn('Could not fetch existing bar lounge:', e);
        }
      })();
    }
  }, [editingHotelId]);

  // Handle document upload
  const handleDocUpload = async (docId, file) => {
    if (!file) return;
    setUploadingDoc(prev => ({ ...prev, [docId]: true }));
    try {
      const uploadedUrl = await uploadImage(file);
      const finalUrl = typeof uploadedUrl === 'string' ? uploadedUrl : (uploadedUrl?.url || '');
      setForm(f => ({
        ...f,
        documents: {
          ...(f.documents || {}),
          [docId]: {
            name: file.name,
            url: finalUrl,
            size: (file.size / 1024).toFixed(1) + ' KB',
            date: new Date().toLocaleDateString()
          }
        }
      }));
    } catch (err) {
      console.error('Doc upload fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({
          ...f,
          documents: {
            ...(f.documents || {}),
            [docId]: {
              name: file.name,
              url: reader.result,
              size: (file.size / 1024).toFixed(1) + ' KB',
              date: new Date().toLocaleDateString()
            }
          }
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingDoc(prev => ({ ...prev, [docId]: false }));
    }
  };

  const handleDocRemove = (docId) => {
    setForm(f => {
      const nextDocs = { ...(f.documents || {}) };
      delete nextDocs[docId];
      return { ...f, documents: nextDocs };
    });
  };

  // Helper field builder
  const fld = (label, key, type = 'text', placeholder = '', required = false, extra = {}) => (
    <div className="mb-3">
      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#495057' }}>
        {label}{required && <span className="text-danger ms-1">*</span>}
      </label>
      {type === 'select' ? (
        <select className="form-select form-select-sm" value={form[key]} onChange={e => set(key, e.target.value)} {...extra}>
          {extra.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="form-control form-control-sm" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3} {...extra}></textarea>
      ) : (
        <input className="form-control form-control-sm" type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} {...extra} />
      )}
    </div>
  );

  // Bar toggling and feature management
  const handleToggleBarFeature = (feat) => {
    const cur = form.bar_features || [];
    if (cur.includes(feat)) set('bar_features', cur.filter(f => f !== feat));
    else set('bar_features', [...cur, feat]);
  };

  const handleAddCustomBarFeature = () => {
    const trimmed = customBarFeature.trim();
    if (trimmed && !(form.bar_features || []).includes(trimmed)) {
      set('bar_features', [...(form.bar_features || []), trimmed]);
      setCustomBarFeature('');
    }
  };

  const handleBarImageUpload = async (files) => {
    if (!files || !files.length) return;
    setUploadingBarImage(true);
    try {
      const uploadedUrls = [];
      for (const file of Array.from(files)) {
        const res = await uploadImage(file);
        const url = typeof res === 'string' ? res : (res?.url || '');
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        const nextImgs = [...(form.bar_images || []), ...uploadedUrls];
        set('bar_images', nextImgs);
        if (!form.bar_cover_image) set('bar_cover_image', nextImgs[0]);
      }
    } catch (err) {
      alert('Failed to upload bar photo: ' + err.message);
    } finally {
      setUploadingBarImage(false);
    }
  };

  // Room type modal handlers
  const handleOpenAddRoom = () => {
    setEditingRoomIndex(null);
    setRoomModalForm(createEmptyRoom());
    setRoomUrlInput('');
    setCustomRoomAmenity('');
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (index) => {
    setEditingRoomIndex(index);
    setRoomModalForm({ ...form.room_types[index] });
    setRoomUrlInput('');
    setCustomRoomAmenity('');
    setShowRoomModal(true);
  };

  const handleDeleteRoom = (index) => {
    if (!window.confirm('Remove this room type from the hotel setup?')) return;
    const removedRt = form.room_types[index];
    const key = removedRt.temp_id || removedRt.id;
    setForm(f => {
      const nextRooms = f.room_types.filter((_, i) => i !== index);
      const nextNums = { ...(f.room_numbers || {}) };
      delete nextNums[key];
      return { ...f, room_types: nextRooms, room_numbers: nextNums };
    });
  };

  const handleQuickAddPreset = (preset) => {
    const newRt = {
      ...createEmptyRoom(),
      ...preset,
      temp_id: 'rt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
    };
    setForm(f => ({
      ...f,
      room_types: [...f.room_types, newRt]
    }));
  };

  const handleSaveRoomModal = () => {
    if (!roomModalForm.name.trim()) {
      alert('Room Type Name is required');
      return;
    }
    if (!roomModalForm.selling_price) {
      alert('Selling Price is required');
      return;
    }

    const updatedRt = {
      ...roomModalForm,
      total_rooms: parseInt(roomModalForm.total_rooms || 1),
      base_price: parseInt(roomModalForm.base_price || roomModalForm.selling_price || 4000),
      selling_price: parseInt(roomModalForm.selling_price || 4500),
      weekend_price: parseInt(roomModalForm.weekend_price || roomModalForm.selling_price || 5000)
    };

    if (editingRoomIndex !== null) {
      const next = [...form.room_types];
      next[editingRoomIndex] = updatedRt;
      set('room_types', next);
    } else {
      set('room_types', [...form.room_types, updatedRt]);
    }
    setShowRoomModal(false);
  };

  // Room Numbers Auto-Generator
  const handleAutoGenerateRoomNumbers = (rt) => {
    const key = rt.temp_id || rt.id;
    const count = parseInt(rt.total_rooms || 1);
    const existingForOtherRooms = Object.values(form.room_numbers || {}).flat().map(r => parseInt(r.number)).filter(n => !isNaN(n));
    let startNum = 101;
    if (existingForOtherRooms.length > 0) {
      const maxNum = Math.max(...existingForOtherRooms);
      startNum = Math.floor(maxNum / 100 + 1) * 100 + 1;
    }

    const generated = [];
    for (let i = 0; i < count; i++) {
      const numStr = String(startNum + i);
      const floorStr = String(Math.floor((startNum + i) / 100));
      generated.push({ number: numStr, floor: floorStr, status: 'Available' });
    }

    setForm(f => ({
      ...f,
      room_numbers: {
        ...(f.room_numbers || {}),
        [key]: generated
      }
    }));
  };

  // Save / Update Master Execution Helper
  const executeSaveProcess = async (targetStatus = 'Draft') => {
    const effectiveId = editingHotelId || createdHotelId;
    
    // Auto-calculate lowest selling price from room types if not manually entered
    let determinedBasePrice = parseInt(form.base_price || 0);
    let determinedSellingPrice = parseInt(form.selling_price || 0);
    if ((!determinedBasePrice || !determinedSellingPrice) && form.room_types.length > 0) {
      const lowestRoomPrice = Math.min(...form.room_types.map(r => parseInt(r.selling_price || 0)).filter(p => p > 0));
      if (lowestRoomPrice && lowestRoomPrice < Infinity) {
        determinedSellingPrice = determinedSellingPrice || lowestRoomPrice;
        determinedBasePrice = determinedBasePrice || Math.round(lowestRoomPrice * 0.9);
      }
    }
    determinedSellingPrice = determinedSellingPrice || 5000;
    determinedBasePrice = determinedBasePrice || 4500;

    const payload = {
      name: form.name || 'Draft Hotel',
      location: form.area || form.city || 'Thailand',
      price: determinedSellingPrice,
      selling_price: determinedSellingPrice,
      base_price: determinedBasePrice,
      amenities: form.facilities.join(', '),
      images_json: form.images,
      stars: parseInt(form.stars || 3),
      rating: 4.5,
      badge: 'Standard',
      description: form.description || '',
      vendor_id: currentUser?.id || 'u-5',
      hotel_status: targetStatus,
      property_type: form.property_type || 'Hotel',
      phone: form.phone || '',
      email: form.email || '',
      website: form.website || '',
      checkin_time: form.checkin_time || '14:00',
      checkout_time: form.checkout_time || '12:00',
      address: form.address || '',
      city: form.city || 'Bangkok',
      state: form.state || 'Bangkok',
      country: form.country || 'Thailand',
      pincode: form.pincode || '',
      gst_number: form.gst_number || '',
      property_registration_no: form.property_registration_no || '',
      facilities_json: JSON.stringify(form.facilities),
      wizard_step: step,
      profile_completion: Math.round((step / 10) * 100),
      documents_json: JSON.stringify(form.documents || {})
    };

    const hotelIdToUse = effectiveId || createdHotelId || `th-htl-${Date.now().toString().slice(-6)}`;
    let savedHotelId = hotelIdToUse;
    setCreatedHotelId(savedHotelId);

    setSavingStatusMsg('Saving hotel property record...');
    if (effectiveId) {
      if (onUpdateHotel) await onUpdateHotel({ ...payload, id: savedHotelId });
      else await updateHotel({ ...payload, id: savedHotelId });
    } else {
      let res;
      if (onAddHotel) res = await onAddHotel({ ...payload, id: savedHotelId });
      else res = await addMasterHotel({ ...payload, id: savedHotelId });
      if (res && (res.id || res.hotel_id)) {
        savedHotelId = res.id || res.hotel_id;
        setCreatedHotelId(savedHotelId);
      }
    }

    // 2. Save Bar & Lounge Profile if configured
    if (form.has_bar || form.facilities.includes('Bar') || form.bar_name) {
      setSavingStatusMsg('Saving Bar & Lounge configuration...');
      try {
        await pmsSaveBarLounge({
          hotel_id: savedHotelId,
          name: form.bar_name.trim() || `${form.name || 'Hotel'} Bar & Lounge`,
          timing_open: form.bar_timing_open || '04:00 PM',
          timing_close: form.bar_timing_close || '01:00 AM',
          entry_policy: form.bar_entry_policy || 'Free Entry for Hotel Guests & Couples',
          description: form.bar_description || '',
          features: form.bar_features || [],
          images: form.bar_images || [],
          cover_image: form.bar_cover_image || (form.bar_images && form.bar_images[0]) || '',
          is_active: form.bar_is_active ? 1 : 0
        });
      } catch (barErr) {
        console.warn('Bar lounge save warning:', barErr);
      }
    }

    // 3. Save Room Types and their Rate Plans
    if (form.room_types.length > 0) {
      setSavingStatusMsg(`Setting up ${form.room_types.length} Room Types & Meal Plans...`);
      for (const rt of form.room_types) {
        // If room type doesn't have a backend id yet, create it
        if (!rt.id || String(rt.id).startsWith('rt_')) {
          try {
            const rtPayload = {
              hotel_id: savedHotelId,
              vendor_id: currentUser?.id || 'u-5',
              name: rt.name,
              internal_code: rt.internal_code || rt.name.substring(0, 3).toUpperCase(),
              description: rt.description || '',
              total_rooms: parseInt(rt.total_rooms || 1),
              max_adults: parseInt(rt.max_adults || 2),
              max_children: parseInt(rt.max_children || 1),
              max_occupancy: parseInt(rt.max_occupancy || 3),
              base_occupancy: parseInt(rt.base_occupancy || 2),
              bed_type: rt.bed_type || 'King',
              num_beds: parseInt(rt.num_beds || 1),
              room_size: rt.room_size || '350',
              room_size_unit: rt.room_size_unit || 'sqft',
              view_type: rt.view_type || 'Garden View',
              smoking: rt.smoking ? 1 : 0,
              air_conditioned: rt.air_conditioned !== false ? 1 : 0,
              private_bathroom: rt.private_bathroom !== false ? 1 : 0,
              extra_bed_available: rt.extra_bed_available ? 1 : 0,
              base_price: parseInt(rt.base_price || rt.selling_price || 4000),
              selling_price: parseInt(rt.selling_price || 4500),
              weekend_price: parseInt(rt.weekend_price || rt.selling_price || 5000),
              extra_adult_charge: parseInt(rt.extra_adult_charge || 1000),
              extra_child_charge: parseInt(rt.extra_child_charge || 500),
              extra_bed_charge: parseInt(rt.extra_bed_charge || 800),
              amenities: rt.amenities || [],
              images: rt.images || [],
              status: 'Active'
            };
            const createdRt = await pmsCreateRoomType(rtPayload);
            const createdRtId = createdRt?.id || createdRt?.room_type?.id;

            if (createdRtId) {
              // Synchronize default meal plans (EP, CP, MAP, AP) for this room type
              try {
                await pmsSyncRoomMealPlans({
                  hotel_id: savedHotelId,
                  room_type_id: createdRtId,
                  meal_plans: [
                    { meal_plan: 'EP', plan_name: 'Room Only', price_adjustment: 0, is_active: 1, inclusions: ['Accommodation only'] },
                    { meal_plan: 'CP', plan_name: 'Bed & Breakfast', price_adjustment: 600, is_active: 1, inclusions: ['Complimentary Buffet Breakfast'] },
                    { meal_plan: 'MAP', plan_name: 'Half Board', price_adjustment: 1400, is_active: 1, inclusions: ['Buffet Breakfast', 'Dinner (Buffet or 3-Course)'] },
                    { meal_plan: 'AP', plan_name: 'Full Board', price_adjustment: 2200, is_active: 1, inclusions: ['Breakfast, Lunch & Dinner'] }
                  ]
                });
              } catch (mpErr) {
                console.warn('Meal plans sync warning:', mpErr);
              }

              // Create physical room numbers if defined
              const roomNums = form.room_numbers?.[rt.temp_id || rt.id] || [];
              for (const rm of roomNums) {
                try {
                  await pmsCreateRoom({
                    hotel_id: savedHotelId,
                    room_type_id: createdRtId,
                    room_number: rm.number,
                    floor: rm.floor || '1',
                    status: rm.status || 'Available'
                  });
                } catch (rmErr) {
                  console.warn('Physical room save warning:', rmErr);
                }
              }
            }
          } catch (rtErr) {
            console.warn('Room type creation error:', rtErr);
          }
        }
      }
    }

    return savedHotelId;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      await executeSaveProcess('Draft');
      window.dispatchEvent(new CustomEvent('hotelsUpdated'));
      setSuccess('Draft saved successfully with rooms & bar configurations!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setSavingStatusMsg('');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Hotel name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await executeSaveProcess('Submitted');
      try { localStorage.removeItem('pms_wizard_hotel_draft'); } catch (e) {}
      window.dispatchEvent(new CustomEvent('hotelsUpdated'));
      setSuccess('Hotel, Room Types & Bar submitted successfully for approval!');
      setTimeout(() => onComplete && onComplete(), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setSavingStatusMsg('');
    }
  };

  // Render individual wizard steps
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="row g-3">
          <div className="col-12 col-md-8">{fld('Hotel Name', 'name', 'text', 'e.g. Taj Exotica Resort & Spa', true)}</div>
          <div className="col-12 col-md-4">{fld('Property Type', 'property_type', 'select', '', false, { options: PROPERTY_TYPES })}</div>
          <div className="col-12 col-md-4">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Star Classification</label>
              <div className="d-flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => set('stars', String(n))} className="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', background: parseInt(form.stars) >= n ? '#FFC107' : '#f0f2f5', border: 'none' }}>
                    <Star size={16} fill={parseInt(form.stars) >= n ? '#FFC107' : 'none'} color={parseInt(form.stars) >= n ? '#FFC107' : '#adb5bd'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">{fld('Year Established', 'year_established', 'number', '2010')}</div>
          <div className="col-12 col-md-4">{fld('Total Rooms', 'total_rooms', 'number', '50')}</div>
          <div className="col-12 col-md-4">{fld('Number of Floors', 'floors', 'number', '5')}</div>
          <div className="col-12 col-md-4">{fld('Reception Phone', 'phone', 'tel', '+91 9876543210')}</div>
          <div className="col-12 col-md-4">{fld('Official Email', 'email', 'email', 'hotel@example.com')}</div>
          <div className="col-12 col-md-4">{fld('Website', 'website', 'url', 'https://hotel.com')}</div>
          <div className="col-12">{fld('Short Description', 'short_description', 'text', 'One line about your property')}</div>
          <div className="col-12">{fld('Full Hotel Description', 'description', 'textarea', 'Describe your property, location, unique features...')}</div>
          <div className="col-12 col-md-6">{fld('Property Registration No.', 'property_registration_no', 'text', 'e.g. REG/THAILAND/2024/1234')}</div>
          <div className="col-12 col-md-6">{fld('GST Number (if applicable)', 'gst_number', 'text', 'e.g. 30AABCT1332L1ZT')}</div>
        </div>
      );

      case 2: return (
        <div className="row g-3">
          <div className="col-12 col-md-4">{fld('Country', 'country', 'text', 'India')}</div>
          <div className="col-12 col-md-4">{fld('State', 'state', 'text', 'Thailand')}</div>
          <div className="col-12 col-md-4">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>City / Area</label>
              <select className="form-select form-select-sm" value={form.city} onChange={e => set('city', e.target.value)}>
                {['Bangkok', 'Sukhumvit', 'Patong', 'Ao Nang', 'Kata & Karon', 'Railay', 'Chaweng', 'Lamai', 'Bangkok & Pattaya', 'Phuket & Krabi', 'Phuket', 'Vasco da Gama', 'Hua Hin', 'Cha-Am', 'Phi Phi', 'Maya Bay', 'Cavelossim'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="col-12">{fld('Full Address', 'address', 'textarea', 'Street, building name, landmark...', true)}</div>
          <div className="col-12 col-md-4">{fld('PIN Code', 'pincode', 'text', '403001')}</div>
          <div className="col-12 col-md-4">{fld('Nearby Landmark', 'landmark', 'text', 'Near Sukhumvit Downtown')}</div>
          <div className="col-12 col-md-4">{fld('Area / Locality', 'area', 'text', 'Sukhumvit')}</div>
          <div className="col-12 col-md-6">{fld('Latitude', 'latitude', 'text', '15.5477')}</div>
          <div className="col-12 col-md-6">{fld('Longitude', 'longitude', 'text', '73.7516')}</div>
          <div className="col-12">
            <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.8rem' }}>
              💡 <strong>Tip:</strong> Enter lat/lng from Google Maps to pin your exact location. Guests will see your location on the map when browsing.
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div>
          <div className="alert alert-info py-2 px-3 mb-4 d-flex align-items-start gap-2" style={{ fontSize: '0.8rem' }}>
            <Camera size={14} className="mt-1 flex-shrink-0" />
            <span>Upload at least <strong>5 high-quality images</strong> for your property. Select multiple images at once. Click any thumbnail to set it as the cover photo.</span>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Upload Hotel Images (Select Multiple Files)</label>
            <div 
              className="border-2 border-dashed rounded-4 p-4 text-center" 
              style={{ borderColor: isDragging ? '#FF6333' : '#dee2e6', background: isDragging ? '#FFF5F2' : '#FAFAFA', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => document.getElementById('hotelImageUpload').click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={async e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const files = Array.from(e.dataTransfer.files);
                  setSaving(true);
                  try {
                    const uploadedUrls = [];
                    for (const file of files) {
                      const resUrl = await uploadImage(file);
                      const finalUrl = typeof resUrl === 'string' ? resUrl : (resUrl?.url || '');
                      if (finalUrl) uploadedUrls.push(finalUrl);
                    }
                    set('images', [...form.images, ...uploadedUrls]);
                  } catch (err) {
                    console.error('Upload failed:', err);
                  } finally {
                    setSaving(false);
                  }
                }
              }}
            >
              <Upload size={32} className="text-muted mb-2 opacity-50" />
              <p className="text-muted mb-1 fw-medium" style={{ fontSize: '0.85rem' }}>
                {saving ? '⏳ Uploading images, please wait...' : 'Click to choose multiple images or drag & drop here'}
              </p>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Select multiple JPG, PNG, WEBP files (Hold Ctrl/Cmd or Shift to select multiple)</p>
              <input id="hotelImageUpload" type="file" multiple accept="image/*" className="d-none"
                onChange={async e => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  setSaving(true);
                  try {
                    const uploadedUrls = [];
                    for (const file of files) {
                      const resUrl = await uploadImage(file);
                      const finalUrl = typeof resUrl === 'string' ? resUrl : (resUrl?.url || '');
                      if (finalUrl) uploadedUrls.push(finalUrl);
                    }
                    set('images', [...form.images, ...uploadedUrls]);
                  } catch (err) {
                    console.error('Image upload failed:', err);
                  } finally {
                    setSaving(false);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Or Add Image URLs (One per line)</label>
            <textarea className="form-control form-control-sm" rows={3} placeholder="https://example.com/hotel1.jpg&#10;https://example.com/hotel2.jpg" value={form.image_urls} onChange={e => { set('image_urls', e.target.value); const urls = e.target.value.split('\n').map(u => u.trim()).filter(Boolean); set('images', urls); }}></textarea>
          </div>
          {form.images.length > 0 && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.82rem' }}>
                  Uploaded Gallery ({form.images.length} images)
                </label>
                <button type="button" className="btn btn-outline-danger btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => set('images', [])}>Clear All</button>
              </div>
              <div className="row g-2">
                {form.images.map((img, i) => (
                  <div key={i} className="col-4 col-md-3 col-lg-2 position-relative group-img">
                    <img 
                      src={img} 
                      alt="" 
                      className="w-100 rounded-3 border" 
                      style={{ height: '85px', objectFit: 'cover', cursor: 'pointer', border: i === 0 ? '2px solid #FF6333 !important' : '1px solid #dee2e6' }} 
                      onClick={() => {
                        if (i !== 0) {
                          const updated = [...form.images];
                          const [picked] = updated.splice(i, 1);
                          updated.unshift(picked);
                          set('images', updated);
                        }
                      }}
                      title="Click to set as cover image"
                    />
                    {i === 0 ? (
                      <span className="position-absolute top-0 start-0 badge" style={{ background: '#FF6333', fontSize: '0.6rem', margin: '4px' }}>Cover</span>
                    ) : (
                      <span className="position-absolute bottom-0 start-0 badge bg-dark bg-opacity-75" style={{ fontSize: '0.55rem', margin: '4px' }}>#{i+1}</span>
                    )}
                    <button type="button" className="position-absolute top-0 end-0 btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center" style={{ width: '20px', height: '20px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', margin: '4px' }} onClick={(ev) => { ev.stopPropagation(); set('images', form.images.filter((_, idx) => idx !== i)); }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem' }}>💡 Tip: Click any photo above to make it the main cover photo.</p>
            </div>
          )}
        </div>
      );

      case 4: {
        const isBarActive = form.facilities.includes('Bar') || form.has_bar;
        return (
          <div>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Select all amenities & facilities available at your property. These will be highlighted on the guest booking page.
            </p>
            <FacilitiesSelector selected={form.facilities} onChange={v => {
              set('facilities', v);
              if (v.includes('Bar')) set('has_bar', true);
            }} />
            
            <div className="alert alert-info py-2 px-3 mt-3 d-flex align-items-center justify-content-between" style={{ fontSize: '0.82rem' }}>
              <span>✓ <strong>{form.facilities.length}</strong> facilities selected</span>
              {!isBarActive && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-bold"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => {
                    set('facilities', [...form.facilities, 'Bar']);
                    set('has_bar', true);
                  }}
                >
                  <Wine size={13} className="me-1" /> + Add On-Site Bar & Lounge
                </button>
              )}
            </div>

            {/* Embedded Hotel Bar & Lounge Profile */}
            {isBarActive && (
              <div className="card border-0 rounded-4 p-4 mt-4 shadow-sm" style={{ background: '#FAF5FF', border: '1.5px solid #E9D5FF' }}>
                <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-purple-200">
                  <div className="d-flex align-items-center gap-2.5">
                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', background: '#7E22CE', color: '#fff' }}>
                      <Wine size={19} />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0" style={{ color: '#581C87' }}>On-Site Bar & Lounge Setup</h6>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Guests will see this verified lounge card, timings, and policies on the hotel booking page.</small>
                    </div>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="hasBarSwitch"
                      checked={form.has_bar}
                      onChange={e => {
                        set('has_bar', e.target.checked);
                        if (!e.target.checked) {
                          set('facilities', form.facilities.filter(x => x !== 'Bar'));
                        }
                      }}
                      style={{ cursor: 'pointer', width: '38px', height: '20px' }}
                    />
                    <label className="form-check-label fw-bold ms-1" htmlFor="hasBarSwitch" style={{ fontSize: '0.8rem', color: '#581C87' }}>
                      {form.has_bar ? 'Active' : 'Disabled'}
                    </label>
                  </div>
                </div>

                {form.has_bar && (
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        Bar / Lounge Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Sunset Breeze Rooftop Lounge & Bar"
                        value={form.bar_name}
                        onChange={e => set('bar_name', e.target.value)}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        <Clock size={12} className="me-1" /> Opening Time
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. 04:00 PM"
                        value={form.bar_timing_open}
                        onChange={e => set('bar_timing_open', e.target.value)}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        <Clock size={12} className="me-1" /> Closing Time
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. 01:00 AM"
                        value={form.bar_timing_close}
                        onChange={e => set('bar_timing_close', e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        <Shield size={12} className="me-1" /> Guest Entry Policy
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={form.bar_entry_policy}
                        onChange={e => set('bar_entry_policy', e.target.value)}
                      >
                        <option value="Free Entry for Hotel Guests & Couples">Free Entry for Hotel Guests & Couples</option>
                        <option value="Exclusive for In-House Hotel Guests">Exclusive for In-House Hotel Guests</option>
                        <option value="Couples & Mixed Groups Only">Couples & Mixed Groups Only</option>
                        <option value="Open to Public (Reservations Recommended)">Open to Public (Reservations Recommended)</option>
                        <option value="Stag Entry Subject to Cover Charge">Stag Entry Subject to Cover Charge</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        Vibe & Description
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Panoramic sea view, signature craft cocktails, DJ beats..."
                        value={form.bar_description}
                        onChange={e => set('bar_description', e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold mb-2" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        <Sparkles size={13} className="me-1 text-warning" /> Highlights & Bar Features
                      </label>
                      <div className="d-flex flex-wrap gap-1.5 mb-2">
                        {BAR_FEATURE_OPTIONS.map(feat => {
                          const isSel = (form.bar_features || []).includes(feat);
                          return (
                            <button
                              key={feat}
                              type="button"
                              onClick={() => handleToggleBarFeature(feat)}
                              className="btn btn-sm rounded-pill px-2.5 py-1 border transition-all"
                              style={{
                                background: isSel ? '#7E22CE' : '#fff',
                                color: isSel ? '#fff' : '#6B21A8',
                                borderColor: isSel ? '#7E22CE' : '#D8B4FE',
                                fontSize: '0.75rem'
                              }}
                            >
                              {isSel && <Check size={11} className="me-1 text-white" />}
                              {feat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Feature Add */}
                      <div className="input-group input-group-sm" style={{ maxWidth: '380px' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="+ Add custom bar feature (e.g. Hookah, Rooftop Pool)"
                          value={customBarFeature}
                          onChange={e => setCustomBarFeature(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomBarFeature(); } }}
                          style={{ fontSize: '0.78rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary px-3"
                          onClick={handleAddCustomBarFeature}
                          disabled={!customBarFeature.trim()}
                          style={{ fontSize: '0.78rem' }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Bar Images */}
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.82rem', color: '#581C87' }}>
                        <Camera size={13} className="me-1" /> Bar & Lounge Photos
                      </label>
                      <div className="d-flex gap-2 mb-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1.5"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => document.getElementById('barPhotoFileInput')?.click()}
                          disabled={uploadingBarImage}
                        >
                          <Upload size={13} /> {uploadingBarImage ? 'Uploading...' : 'Upload Photos'}
                        </button>
                        <input
                          id="barPhotoFileInput"
                          type="file"
                          multiple
                          accept="image/*"
                          className="d-none"
                          onChange={e => {
                            handleBarImageUpload(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <div className="input-group input-group-sm flex-grow-1">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Or paste direct image URL (https://...)"
                            value={barUrlInput}
                            onChange={e => setBarUrlInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const trimmed = barUrlInput.trim();
                                if (trimmed) {
                                  const nextImgs = [...(form.bar_images || []), trimmed];
                                  set('bar_images', nextImgs);
                                  if (!form.bar_cover_image) set('bar_cover_image', trimmed);
                                  setBarUrlInput('');
                                }
                              }
                            }}
                            style={{ fontSize: '0.78rem' }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              const trimmed = barUrlInput.trim();
                              if (trimmed) {
                                const nextImgs = [...(form.bar_images || []), trimmed];
                                set('bar_images', nextImgs);
                                if (!form.bar_cover_image) set('bar_cover_image', trimmed);
                                setBarUrlInput('');
                              }
                            }}
                            style={{ fontSize: '0.78rem' }}
                          >
                            Add URL
                          </button>
                        </div>
                      </div>

                      {/* Bar Image Thumbnails */}
                      {form.bar_images && form.bar_images.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 pt-1">
                          {form.bar_images.map((img, idx) => (
                            <div key={idx} className="position-relative" style={{ width: '80px', height: '60px' }}>
                              <img
                                src={img}
                                alt="Bar"
                                className="w-100 h-100 rounded-3 border"
                                style={{ objectFit: 'cover', cursor: 'pointer', border: form.bar_cover_image === img ? '2px solid #7E22CE !important' : '1px solid #dee2e6' }}
                                onClick={() => set('bar_cover_image', img)}
                                title="Click to set as cover photo"
                              />
                              {form.bar_cover_image === img && (
                                <span className="position-absolute top-0 start-0 badge bg-purple text-white" style={{ fontSize: '0.55rem', margin: '2px', background: '#7E22CE' }}>Cover</span>
                              )}
                              <button
                                type="button"
                                className="position-absolute top-0 end-0 btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '18px', height: '18px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', margin: '2px' }}
                                onClick={() => {
                                  const updated = form.bar_images.filter((_, i) => i !== idx);
                                  set('bar_images', updated);
                                  if (form.bar_cover_image === img) {
                                    set('bar_cover_image', updated[0] || '');
                                  }
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 5: return (
        <div className="row g-3">
          <div className="col-12 col-md-3">{fld('Standard Check-in', 'checkin_time', 'time')}</div>
          <div className="col-12 col-md-3">{fld('Standard Check-out', 'checkout_time', 'time')}</div>
          <div className="col-12 col-md-3">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Smoking Policy</label>
              <select className="form-select form-select-sm" value={form.smoking_policy} onChange={e => set('smoking_policy', e.target.value)}>
                {['Non-Smoking Property', 'Smoking Allowed in Designated Areas', 'Smoking Allowed'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Pet Policy</label>
              <select className="form-select form-select-sm" value={form.pet_policy} onChange={e => set('pet_policy', e.target.value)}>
                {['No Pets Allowed', 'Pets Welcome', 'Small Pets Only'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="col-12">{fld('Cancellation Policy', 'cancellation_policy', 'textarea', 'Free cancellation up to 24 hours before check-in. After that, first night charge applies...')}</div>
          <div className="col-12">{fld('Child Policy', 'child_policy', 'textarea', 'Children below 5 years stay free. Extra bed available at additional charge...')}</div>
          <div className="col-12">{fld('Property Rules & Special Instructions', 'property_rules', 'textarea', 'No loud music after 11 PM. ID proof mandatory for all guests...')}</div>
          <div className="col-12 col-md-6">
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Unmarried Couples Policy</label>
              <select className="form-select form-select-sm" value={form.unmarried_couple_policy} onChange={e => set('unmarried_couple_policy', e.target.value)}>
                {['Allowed', 'Not Allowed', 'With ID Proof'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      );

      case 6: {
        const totalInventory = form.room_types.reduce((acc, r) => acc + (parseInt(r.total_rooms) || 0), 0);
        return (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-1" style={{ color: '#1a2b4a' }}>
                  Room Types & Inventory ({form.room_types.length} Types • {totalInventory} Total Rooms)
                </h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>
                  Define room configurations, pricing, and amenities. Standard meal plans (Room Only, Breakfast, Half Board, Full Board) will be automatically enabled for each room.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
                style={{ background: '#0D1B2E', color: '#fff' }}
                onClick={handleOpenAddRoom}
              >
                <Plus size={14} /> + Add Room Type
              </button>
            </div>

            {/* If no room types, show quick-start templates */}
            {form.room_types.length === 0 ? (
              <div className="card border-0 rounded-4 p-4 text-center" style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1' }}>
                <div className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px', background: '#E2E8F0', color: '#475569' }}>
                  <BedDouble size={26} />
                </div>
                <h6 className="fw-bold mb-1" style={{ color: '#1E293B' }}>No Room Types Added Yet</h6>
                <p className="text-muted mx-auto mb-3" style={{ fontSize: '0.82rem', maxWidth: '460px' }}>
                  Add your property's room categories so guests can view photos, select meal plans, and book directly.
                </p>

                <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                  {QUICK_ROOM_PRESETS.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 fw-medium"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => handleQuickAddPreset(p)}
                    >
                      ⚡ + {p.name} (฿{p.selling_price.toLocaleString()}/nt • {p.total_rooms} Rms)
                    </button>
                  ))}
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn-sm rounded-pill px-4 py-2 fw-bold"
                    style={{ background: '#0D1B2E', color: '#fff' }}
                    onClick={handleOpenAddRoom}
                  >
                    + Add Custom Room Type
                  </button>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {form.room_types.map((rt, idx) => (
                  <div key={rt.temp_id || rt.id || idx} className="card border-0 rounded-4 p-3 shadow-sm bg-white border">
                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-3">
                        {rt.images && rt.images[0] ? (
                          <img
                            src={rt.images[0]}
                            alt={rt.name}
                            className="rounded-3 border"
                            style={{ width: '80px', height: '70px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="rounded-3 bg-light d-flex align-items-center justify-content-center border" style={{ width: '80px', height: '70px', color: '#94A3B8' }}>
                            <BedDouble size={28} />
                          </div>
                        )}
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="fw-bold mb-0" style={{ color: '#0F172A', fontSize: '0.92rem' }}>{rt.name}</h6>
                            {rt.internal_code && (
                              <span className="badge bg-light text-secondary border py-0.5 px-1.5" style={{ fontSize: '0.68rem' }}>{rt.internal_code}</span>
                            )}
                            <span className="badge bg-primary bg-opacity-10 text-primary py-0.5 px-2" style={{ fontSize: '0.7rem' }}>
                              {rt.total_rooms} Rooms Inventory
                            </span>
                          </div>
                          <div className="text-muted d-flex align-items-center gap-2 mt-1 flex-wrap" style={{ fontSize: '0.76rem' }}>
                            <span>🛏️ {rt.bed_type || 'King'} Bed</span>
                            <span>•</span>
                            <span>👥 Max {rt.max_occupancy || 3} Guests ({rt.max_adults || 2} Adults, {rt.max_children || 1} Child)</span>
                            {rt.room_size && (
                              <>
                                <span>•</span>
                                <span>📐 {rt.room_size} {rt.room_size_unit || 'sqft'}</span>
                              </>
                            )}
                            {rt.view_type && (
                              <>
                                <span>•</span>
                                <span>🌅 {rt.view_type}</span>
                              </>
                            )}
                          </div>
                          {rt.amenities && rt.amenities.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1.5">
                              {rt.amenities.slice(0, 4).map(a => (
                                <span key={a} className="badge bg-light text-muted border py-0.5 px-1.5" style={{ fontSize: '0.68rem' }}>
                                  ✓ {a}
                                </span>
                              ))}
                              {rt.amenities.length > 4 && (
                                <span className="text-muted" style={{ fontSize: '0.68rem', alignSelf: 'center' }}>
                                  +{rt.amenities.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3 align-self-end align-self-md-center">
                        <div className="text-end">
                          <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
                            ฿{parseInt(rt.selling_price || 0).toLocaleString()}
                            <span className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}> / night</span>
                          </div>
                          {rt.base_price && rt.base_price !== rt.selling_price && (
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Base: ฿{parseInt(rt.base_price).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-circle p-1.5"
                            onClick={() => handleOpenEditRoom(idx)}
                            title="Edit Room Type"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-circle p-1.5"
                            onClick={() => handleDeleteRoom(idx)}
                            title="Delete Room Type"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="d-flex justify-content-between align-items-center pt-2">
                  <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                    💡 Rate plans (EP, CP, MAP, AP) will be automatically configured for each room.
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1"
                    style={{ fontSize: '0.78rem' }}
                    onClick={handleOpenAddRoom}
                  >
                    + Add Another Room Type
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 7: {
        return (
          <div>
            <div className="alert alert-info py-2 px-3 mb-4 d-flex align-items-start gap-2" style={{ fontSize: '0.82rem' }}>
              <Layers size={14} className="mt-1 flex-shrink-0" />
              <span>
                Assign physical room numbers (e.g. 101, 102, 201) to each of your room types. This allows the PMS front-desk to manage check-ins and housekeeping status.
              </span>
            </div>

            {form.room_types.length === 0 ? (
              <div className="card border-0 rounded-4 p-4 text-center bg-light">
                <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                  No room types have been configured yet. Please go back to Step 6 to add room types first.
                </p>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm rounded-pill px-4 fw-bold"
                    style={{ background: '#0D1B2E', color: '#fff' }}
                    onClick={() => setStep(6)}
                  >
                    ← Back to Step 6: Room Setup
                  </button>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {form.room_types.map((rt) => {
                  const key = rt.temp_id || rt.id;
                  const roomNums = form.room_numbers?.[key] || [];
                  const reqCount = parseInt(rt.total_rooms || 1);
                  const isComplete = roomNums.length >= reqCount;

                  return (
                    <div key={key} className="card border-0 rounded-4 p-3 shadow-sm bg-white border">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                          <h6 className="fw-bold mb-0" style={{ color: '#0F172A' }}>{rt.name}</h6>
                          <small className="text-muted" style={{ fontSize: '0.76rem' }}>
                            Inventory: {reqCount} physical rooms required • Configured: {roomNums.length}
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isComplete ? (
                            <span className="badge bg-success bg-opacity-10 text-success py-1 px-2.5 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                              <CheckCircle size={12} /> Configured
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-bold"
                              style={{ fontSize: '0.76rem' }}
                              onClick={() => handleAutoGenerateRoomNumbers(rt)}
                            >
                              ⚡ Auto-Generate Numbers
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display Numbers */}
                      <div className="p-2.5 rounded-3 bg-light border d-flex flex-wrap gap-1.5 align-items-center">
                        {roomNums.length === 0 ? (
                          <span className="text-muted fst-italic" style={{ fontSize: '0.78rem' }}>
                            No room numbers assigned yet. Click "Auto-Generate Numbers" above.
                          </span>
                        ) : (
                          roomNums.map((rm, rIdx) => (
                            <span key={rIdx} className="badge bg-white text-dark border px-2.5 py-1.5 d-flex align-items-center gap-1.5 shadow-sm" style={{ fontSize: '0.76rem' }}>
                              <strong>#{rm.number}</strong>
                              <span className="text-muted" style={{ fontSize: '0.68rem' }}>(Fl {rm.floor || '1'})</span>
                              <button
                                type="button"
                                className="btn btn-sm p-0 text-muted ms-1"
                                style={{ lineHeight: 1 }}
                                onClick={() => {
                                  const updated = roomNums.filter((_, i) => i !== rIdx);
                                  setForm(f => ({
                                    ...f,
                                    room_numbers: { ...(f.room_numbers || {}), [key]: updated }
                                  }));
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 8: {
        const lowestRoomPrice = form.room_types.length > 0
          ? Math.min(...form.room_types.map(r => parseInt(r.selling_price || 0)).filter(p => p > 0))
          : null;

        return (
          <div className="row g-3">
            <div className="col-12">
              <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.82rem' }}>
                💡 <strong>Property Listing Rates:</strong> This sets the base starting price displayed on search listings. Detailed room-by-room pricing was configured in Step 6.
                {lowestRoomPrice && lowestRoomPrice < Infinity && (
                  <div className="mt-1 fw-semibold text-primary">
                    Lowest Room Type Rate: ฿{lowestRoomPrice.toLocaleString()}/night
                  </div>
                )}
              </div>
            </div>
            <div className="col-12 col-md-4">{fld('Base Price (฿/night)', 'base_price', 'number', lowestRoomPrice ? String(Math.round(lowestRoomPrice * 0.9)) : '4000', true)}</div>
            <div className="col-12 col-md-4">{fld('Selling Price (฿/night)', 'selling_price', 'number', lowestRoomPrice ? String(lowestRoomPrice) : '4500')}</div>
            <div className="col-12 col-md-4">{fld('Weekend Price (฿/night)', 'weekend_price', 'number', lowestRoomPrice ? String(Math.round(lowestRoomPrice * 1.2)) : '5500')}</div>
          </div>
        );
      }

      case 9: return (
        <div>
          <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Upload required documents for verification. Documents are reviewed by admin before your hotel goes live.</p>
          {REQUIRED_DOCUMENTS.map(doc => {
            const uploaded = form.documents && form.documents[doc.id];
            const isUploading = uploadingDoc[doc.id];
            return (
              <div key={doc.id} className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-2 border" style={{ background: uploaded ? '#f0fbf4' : '#f8f9fa', borderColor: uploaded ? '#bbf7d0' : '#e5e7eb', transition: 'all 0.2s' }}>
                <div className="d-flex align-items-center gap-2 flex-grow-1 me-2 overflow-hidden">
                  {uploaded ? <FileCheck size={20} className="text-success flex-shrink-0" /> : <FileText size={20} className="text-muted flex-shrink-0" />}
                  <div className="text-truncate">
                    <div className="fw-semibold text-truncate" style={{ fontSize: '0.85rem', color: '#1a2b4a' }}>
                      {doc.label} {doc.required && <span className="text-danger">*</span>}
                    </div>
                    {uploaded ? (
                      <div className="text-success d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
                        <span className="fw-medium text-truncate">✓ {uploaded.name}</span>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-0.5 px-1.5" style={{ fontSize: '0.68rem' }}>{uploaded.size || 'Uploaded'}</span>
                      </div>
                    ) : (
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        PDF, JPG, PNG or WEBP (Up to 10MB)
                      </div>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  {uploaded ? (
                    <>
                      {uploaded.url && (
                        <a 
                          href={uploaded.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 d-flex align-items-center gap-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Eye size={12} /> View
                        </a>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-dark rounded-pill px-2.5 py-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => document.getElementById(`docUpload_${doc.id}`).click()}
                      >
                        Replace
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-danger rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => handleDocRemove(doc.id)}
                        title="Remove document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 shadow-sm" 
                      style={{ background: '#0D1B2E', color: '#fff', fontSize: '0.78rem' }}
                      disabled={isUploading}
                      onClick={() => document.getElementById(`docUpload_${doc.id}`).click()}
                    >
                      <Upload size={13} /> {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                  <input 
                    id={`docUpload_${doc.id}`} 
                    type="file" 
                    accept=".pdf,image/*" 
                    className="d-none" 
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleDocUpload(doc.id, e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );

      case 10: {
        const totalInventory = form.room_types.reduce((acc, r) => acc + (parseInt(r.total_rooms) || 0), 0);
        const hasBarConfigured = form.has_bar || form.facilities.includes('Bar');

        return (
          <div>
            <div className="row g-3 mb-4">
              {[
                { label: 'Hotel Name', value: form.name || '—', ok: !!form.name },
                { label: 'Location', value: `${form.area || form.city || '—'}, ${form.state}`, ok: !!(form.city) },
                { label: 'Property Type', value: form.property_type, ok: true },
                { label: 'Star Rating', value: `${form.stars} Star`, ok: true },
                { label: 'Contact', value: form.phone || form.email || '—', ok: !!(form.phone || form.email) },
                { label: 'Starting Price', value: form.selling_price || form.base_price ? `฿${form.selling_price || form.base_price}/night` : '—', ok: !!(form.selling_price || form.base_price) },
                { label: 'Facilities', value: `${form.facilities.length} selected`, ok: form.facilities.length > 0 },
                {
                  label: 'Room Types & Inventory',
                  value: form.room_types.length > 0 ? `${form.room_types.length} Types (${totalInventory} Rooms)` : 'None added yet',
                  ok: form.room_types.length > 0
                },
                {
                  label: 'Bar & Lounge',
                  value: hasBarConfigured ? (form.bar_name || 'Active Lounge Setup') : 'Not included',
                  ok: hasBarConfigured
                },
                { label: 'Images', value: `${form.images.length} uploaded`, ok: form.images.length >= 1 },
                { label: 'Documents', value: `${Object.keys(form.documents || {}).length} uploaded`, ok: Object.keys(form.documents || {}).length >= 1 }
              ].map(item => (
                <div key={item.label} className="col-12 col-md-6">
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: item.ok ? '#edf7f0' : '#fff3f0' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{item.label}</div>
                      <div className="fw-bold" style={{ fontSize: '0.85rem' }}>{item.value}</div>
                    </div>
                    {item.ok ? <Check size={18} color="#00b894" /> : <AlertCircle size={18} color="#e17055" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="alert py-3 px-4" style={{ background: '#fff9e6', border: '1px solid #fdcb6e', borderRadius: '12px', fontSize: '0.82rem' }}>
              <strong>📋 Terms & Conditions:</strong> By submitting this hotel, you confirm that all information is accurate and you have the legal right to list this property. The platform will review and approve the listing within 2-3 business days.
            </div>
            <div className="d-flex align-items-center gap-2 mt-3">
              <input type="checkbox" id="terms" className="form-check-input" defaultChecked />
              <label htmlFor="terms" className="form-check-label" style={{ fontSize: '0.82rem' }}>I agree to the terms and conditions and confirm all information is accurate</label>
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <div className="p-4" style={{ background: '#f0f2f5', minHeight: '100%' }}>
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#1a2b4a' }}>Add New Hotel</h4>
        <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Fill in the details step by step. You can save as a draft anytime and continue later.</p>
      </div>

      <div className="card border-0 rounded-4 shadow-sm p-4">
        <ProgressBar current={step} total={10} onSelectStep={(targetStep) => setStep(targetStep)} />

        {error && (
          <div 
            onClick={() => {
              const errLower = (error || '').toLowerCase();
              if (errLower.includes('phone') || errLower.includes('email') || errLower.includes('contact') || errLower.includes('name')) {
                setStep(1);
              } else if (errLower.includes('location') || errLower.includes('city') || errLower.includes('area')) {
                setStep(2);
              } else if (errLower.includes('image') || errLower.includes('photo')) {
                setStep(3);
              } else if (errLower.includes('room') || errLower.includes('inventory')) {
                setStep(6);
              } else if (errLower.includes('document')) {
                setStep(9);
              } else {
                setStep(1);
              }
            }}
            className="alert alert-danger py-2.5 px-3.5 mb-3 d-flex align-items-center justify-content-between rounded-3 shadow-xs" 
            style={{ fontSize: '0.82rem', cursor: 'pointer', border: '1.5px solid #ff7675' }}
            title="Click to jump to the step to fix this error"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span className="fw-medium">{error}</span>
            </div>
            <span className="badge bg-danger text-white rounded-pill px-2.5 py-1" style={{ fontSize: '0.68rem' }}>
              Click to Fix →
            </span>
          </div>
        )}
        {success && <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '0.82rem' }}>✅ {success}</div>}
        {savingStatusMsg && <div className="alert alert-info py-2 px-3 mb-3" style={{ fontSize: '0.82rem' }}>⏳ {savingStatusMsg}</div>}

        <div className="mb-4">
          <h6 className="fw-bold mb-3" style={{ color: '#1a2b4a', borderBottom: '2px solid #FF6333', paddingBottom: '8px', display: 'inline-block' }}>
            Step {step}: {STEPS[step - 1].label}
          </h6>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="d-flex align-items-center justify-content-between pt-3" style={{ borderTop: '1px solid #f0f2f5' }}>
          <button type="button" className="btn rounded-pill px-4" style={{ background: '#f0f2f5', color: '#495057' }} onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            <ChevronLeft size={16} /> Back
          </button>

          <div className="d-flex gap-2">
            <button type="button" className="btn rounded-pill px-4 d-flex align-items-center gap-1" style={{ background: '#f0f2f5', color: '#495057', fontSize: '0.85rem' }} onClick={handleSaveDraft} disabled={saving}>
              <Save size={14} /> Save Draft
            </button>

            {step < 10 ? (
              <button type="button" className="btn rounded-pill px-4 fw-bold d-flex align-items-center gap-1" style={{ background: '#0D1B2E', color: '#fff' }} onClick={() => setStep(step + 1)}>
                Next: {STEPS[step].label} <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn rounded-pill px-4 fw-bold d-flex align-items-center gap-1" style={{ background: '#00b894', color: '#fff' }} onClick={handleSubmit} disabled={saving}>
                {saving ? (savingStatusMsg || 'Submitting...') : '🚀 Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Room Type Add/Edit Modal */}
      {showRoomModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="bg-white rounded-4 shadow-lg overflow-auto" style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh' }}>
            <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
              <h5 className="fw-bold mb-0" style={{ color: '#0F172A' }}>
                {editingRoomIndex !== null ? 'Edit Room Type' : 'Add New Room Type'}
              </h5>
              <button onClick={() => setShowRoomModal(false)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>

            <div className="p-4">
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Room Type Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Deluxe Ocean View Room"
                    value={roomModalForm.name}
                    onChange={e => setRoomModalForm({ ...roomModalForm, name: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Internal Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. DLX-01"
                    value={roomModalForm.internal_code}
                    onChange={e => setRoomModalForm({ ...roomModalForm, internal_code: e.target.value })}
                  />
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Total Rooms <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={roomModalForm.total_rooms}
                    onChange={e => setRoomModalForm({ ...roomModalForm, total_rooms: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Bed Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={roomModalForm.bed_type}
                    onChange={e => setRoomModalForm({ ...roomModalForm, bed_type: e.target.value })}
                  >
                    {BED_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Number of Beds</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={roomModalForm.num_beds}
                    onChange={e => setRoomModalForm({ ...roomModalForm, num_beds: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>View Type</label>
                  <select
                    className="form-select form-select-sm"
                    value={roomModalForm.view_type}
                    onChange={e => setRoomModalForm({ ...roomModalForm, view_type: e.target.value })}
                  >
                    {VIEW_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* Capacity */}
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Max Adults</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={roomModalForm.max_adults}
                    onChange={e => setRoomModalForm({ ...roomModalForm, max_adults: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Max Children</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={roomModalForm.max_children}
                    onChange={e => setRoomModalForm({ ...roomModalForm, max_children: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Max Occupancy</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={roomModalForm.max_occupancy}
                    onChange={e => setRoomModalForm({ ...roomModalForm, max_occupancy: e.target.value })}
                  />
                </div>

                {/* Pricing */}
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Selling Price (฿) <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="4500"
                    value={roomModalForm.selling_price}
                    onChange={e => setRoomModalForm({ ...roomModalForm, selling_price: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Base Price (฿)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="4000"
                    value={roomModalForm.base_price}
                    onChange={e => setRoomModalForm({ ...roomModalForm, base_price: e.target.value })}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Weekend Price (฿)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="5500"
                    value={roomModalForm.weekend_price}
                    onChange={e => setRoomModalForm({ ...roomModalForm, weekend_price: e.target.value })}
                  />
                </div>

                {/* Room Size */}
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Room Size (sqft)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. 350"
                    value={roomModalForm.room_size}
                    onChange={e => setRoomModalForm({ ...roomModalForm, room_size: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>Features Check</label>
                  <div className="d-flex gap-3 pt-1">
                    <label className="form-check-label d-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={roomModalForm.air_conditioned}
                        onChange={e => setRoomModalForm({ ...roomModalForm, air_conditioned: e.target.checked })}
                      /> AC
                    </label>
                    <label className="form-check-label d-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={roomModalForm.private_bathroom}
                        onChange={e => setRoomModalForm({ ...roomModalForm, private_bathroom: e.target.checked })}
                      /> Private Bath
                    </label>
                    <label className="form-check-label d-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={roomModalForm.smoking}
                        onChange={e => setRoomModalForm({ ...roomModalForm, smoking: e.target.checked })}
                      /> Smoking
                    </label>
                  </div>
                </div>

                {/* Amenities Selection */}
                <div className="col-12">
                  <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.82rem' }}>Room Amenities</label>
                  <div className="p-2.5 rounded-3 bg-light border d-flex flex-wrap gap-1 mb-2" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                    {STANDARD_ROOM_AMENITIES.map(a => {
                      const isSel = (roomModalForm.amenities || []).includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          className="btn btn-sm rounded-pill px-2.5 py-1 border"
                          style={{
                            background: isSel ? '#0D1B2E' : '#fff',
                            color: isSel ? '#fff' : '#495057',
                            borderColor: isSel ? '#0D1B2E' : '#dee2e6',
                            fontSize: '0.72rem'
                          }}
                          onClick={() => {
                            const cur = roomModalForm.amenities || [];
                            if (cur.includes(a)) {
                              setRoomModalForm({ ...roomModalForm, amenities: cur.filter(x => x !== a) });
                            } else {
                              setRoomModalForm({ ...roomModalForm, amenities: [...cur, a] });
                            }
                          }}
                        >
                          {isSel && <Check size={10} className="me-1 text-white" />}
                          {a}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Room Amenity */}
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+ Add custom room amenity (e.g. Nespresso, Bathtub)"
                      value={customRoomAmenity}
                      onChange={e => setCustomRoomAmenity(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = customRoomAmenity.trim();
                          if (trimmed && !(roomModalForm.amenities || []).includes(trimmed)) {
                            setRoomModalForm({ ...roomModalForm, amenities: [...(roomModalForm.amenities || []), trimmed] });
                            setCustomRoomAmenity('');
                          }
                        }
                      }}
                      style={{ fontSize: '0.78rem' }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3"
                      onClick={() => {
                        const trimmed = customRoomAmenity.trim();
                        if (trimmed && !(roomModalForm.amenities || []).includes(trimmed)) {
                          setRoomModalForm({ ...roomModalForm, amenities: [...(roomModalForm.amenities || []), trimmed] });
                          setCustomRoomAmenity('');
                        }
                      }}
                      style={{ fontSize: '0.78rem' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Room Images */}
                <div className="col-12">
                  <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.82rem' }}>Room Photos</label>
                  <div className="d-flex gap-2 mb-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1.5"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => document.getElementById('modalRoomPhotoInput')?.click()}
                      disabled={uploadingRoomImages}
                    >
                      <Upload size={13} /> {uploadingRoomImages ? 'Uploading...' : 'Upload Photos'}
                    </button>
                    <input
                      id="modalRoomPhotoInput"
                      type="file"
                      multiple
                      accept="image/*"
                      className="d-none"
                      onChange={async e => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        setUploadingRoomImages(true);
                        try {
                          const uploadedUrls = [];
                          for (const file of files) {
                            const res = await uploadImage(file);
                            const url = typeof res === 'string' ? res : (res?.url || '');
                            if (url) uploadedUrls.push(url);
                          }
                          setRoomModalForm(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
                        } catch (err) {
                          alert('Upload error: ' + err.message);
                        } finally {
                          setUploadingRoomImages(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="input-group input-group-sm flex-grow-1">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Or paste direct image URL (https://...)"
                        value={roomUrlInput}
                        onChange={e => setRoomUrlInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = roomUrlInput.trim();
                            if (trimmed) {
                              setRoomModalForm(prev => ({ ...prev, images: [...(prev.images || []), trimmed] }));
                              setRoomUrlInput('');
                            }
                          }
                        }}
                        style={{ fontSize: '0.78rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          const trimmed = roomUrlInput.trim();
                          if (trimmed) {
                            setRoomModalForm(prev => ({ ...prev, images: [...(prev.images || []), trimmed] }));
                            setRoomUrlInput('');
                          }
                        }}
                        style={{ fontSize: '0.78rem' }}
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  {/* Room Image Thumbnails */}
                  {roomModalForm.images && roomModalForm.images.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 pt-1">
                      {roomModalForm.images.map((img, idx) => (
                        <div key={idx} className="position-relative" style={{ width: '80px', height: '60px' }}>
                          <img
                            src={img}
                            alt="Room"
                            className="w-100 h-100 rounded-3 border"
                            style={{ objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            className="position-absolute top-0 end-0 btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '18px', height: '18px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', margin: '2px' }}
                            onClick={() => {
                              const updated = roomModalForm.images.filter((_, i) => i !== idx);
                              setRoomModalForm({ ...roomModalForm, images: updated });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-top d-flex justify-content-end gap-2">
              <button onClick={() => setShowRoomModal(false)} className="btn btn-sm rounded-pill px-4" style={{ background: '#f0f2f5', color: '#495057' }}>
                Cancel
              </button>
              <button onClick={handleSaveRoomModal} className="btn btn-sm rounded-pill px-4 fw-bold" style={{ background: '#0D1B2E', color: '#fff' }}>
                {editingRoomIndex !== null ? 'Update Room Type' : 'Add Room Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
