import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, X, Save, Camera, Car, Upload, Loader2, Star, Image as ImageIcon, ShieldCheck, Key, Fuel, Navigation, Luggage, AlertCircle } from 'lucide-react';
import { toggleVehicleAvailability, updateVehicle, deleteVehicle, uploadImage, apiFetch, API_BASE } from '../../../services/api';

function VehicleCard({ vehicle, type, onEdit, onToggle, onDelete, isSuspended }) {
  const available = vehicle.is_available !== 0 && vehicle.is_available !== false && vehicle.is_available !== '0';
  const [imgFailed, setImgFailed] = useState(false);

  let allImages = [];
  if (vehicle.images_json) {
    try {
      const parsed = JSON.parse(vehicle.images_json);
      if (Array.isArray(parsed) && parsed.length > 0) allImages = parsed;
    } catch (e) {}
  }
  if (allImages.length === 0 && vehicle.image) {
    allImages = [vehicle.image];
  }

  const displayImage = allImages[0] || vehicle.image;

  return (
    <div className="rounded-3 overflow-hidden shadow-sm h-100 d-flex flex-column justify-content-between" style={{ background: '#fff', border: `1px solid ${available ? 'rgba(22,163,74,0.2)' : 'rgba(0,0,0,0.07)'}` }}>
      <div>
        <div className="position-relative" style={{ height: '160px', background: '#f8fafc', overflow: 'hidden' }}>
          {displayImage && !imgFailed ? (
            <img
              src={displayImage}
              alt={vehicle.name}
              onError={() => setImgFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-3" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', color: '#64748b' }}>
              <div className="rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-xs" style={{ width: '44px', height: '44px', background: 'rgba(100,116,139,0.1)', border: '1px dashed rgba(100,116,139,0.25)' }}>
                <Camera size={20} className="text-secondary opacity-75" />
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', letterSpacing: '0.2px' }}>No Photo Uploaded</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Click Edit to upload</span>
            </div>
          )}
          <div className="position-absolute top-0 start-0 m-2 d-flex gap-1">
            {isSuspended ? (
              <span className="px-2 py-1 rounded-pill fw-bold text-white shadow-sm" style={{ background: '#dc2626', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                HIDDEN — ADMIN REACTIVATION REQUIRED
              </span>
            ) : (
              <span className="px-2 py-1 rounded-pill fw-bold" style={{ background: available ? '#dcfce7' : '#fee2e2', color: available ? '#16a34a' : '#dc2626', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                {available ? 'Available' : 'Unavailable'}
              </span>
            )}
            {allImages.length > 1 && (
              <span className="px-2 py-1 rounded-pill fw-bold text-white shadow-sm d-flex align-items-center gap-1" style={{ background: 'rgba(13,27,46,0.75)', backdropFilter: 'blur(4px)', fontSize: '0.62rem' }}>
                <ImageIcon size={10} /> {allImages.length} Photos
              </span>
            )}
          </div>
          <div className="position-absolute top-0 end-0 m-2">
            <span className="px-2 py-1 rounded-pill fw-bold text-white" style={{ background: '#2563eb', fontSize: '0.62rem', textTransform: 'uppercase' }}>
              Cab Transfer
            </span>
          </div>
        </div>
        <div className="p-3 pb-1">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <div className="fw-bold" style={{ color: '#0D1B2E', fontSize: '14px' }}>{vehicle.name}</div>
            {vehicle.registration_no && (
              <span className="px-1.5 py-0.5 rounded font-monospace fw-bold" style={{ background: '#0D1B2E', color: '#FACC15', fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                {vehicle.registration_no}
              </span>
            )}
          </div>
          <div className="d-flex gap-1 flex-wrap mb-2">
            {vehicle.model_year && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#fef08a', color: '#854d0e', fontSize: '0.65rem', fontWeight: 700 }}>
                📅 {vehicle.model_year}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-2" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.65rem', fontWeight: 700 }}>
              Fleet: {vehicle.fleet_count || 1} {(vehicle.fleet_count || 1) === 1 ? 'Unit' : 'Units'}
            </span>
            <span className="px-2 py-0.5 rounded-2" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 700 }}>
              💰 ฿{vehicle.security_deposit !== undefined ? Number(vehicle.security_deposit).toLocaleString('en-US') : '2,000'} Deposit
            </span>
            {vehicle.don_mueang_delivery_fee !== undefined && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#0284c7', fontSize: '0.65rem', fontWeight: 600 }}>
                ✈️ Don Mueang: ฿{vehicle.don_mueang_delivery_fee}
              </span>
            )}
            {vehicle.Suvarnabhumi_delivery_fee !== undefined && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#0284c7', fontSize: '0.65rem', fontWeight: 600 }}>
                ✈️ Suvarnabhumi: ฿{vehicle.Suvarnabhumi_delivery_fee}
              </span>
            )}
            {(vehicle.has_ac !== 0 && vehicle.has_ac !== false) && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.65rem', fontWeight: 600 }}>❄️ AC</span>
            )}
            {(vehicle.has_fastag !== 0 && vehicle.has_fastag !== false) && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.65rem', fontWeight: 600 }}>⚡ Easy Pass</span>
            )}
            {(vehicle.has_carplay_android_auto !== 0 && vehicle.has_carplay_android_auto !== false) && (
              <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.65rem', fontWeight: 600 }}>📱 CarPlay</span>
            )}
            {vehicle.category && <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 600 }}>{vehicle.category}</span>}
            {vehicle.fuel && <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 600 }}>{vehicle.fuel}</span>}
            {vehicle.transmission && <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 600 }}>{vehicle.transmission}</span>}
            {vehicle.seating && <span className="px-2 py-0.5 rounded-2" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 600 }}>{vehicle.seating}</span>}
          </div>
        </div>
      </div>
      <div className="p-3 pt-0">
        <div className="d-flex align-items-center justify-content-between pt-2 border-top">
          <div>
            <div className="fw-bold" style={{ color: '#FF6333', fontSize: '1.1rem' }}>฿{vehicle.price}<span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>/day</span></div>
            {vehicle.location && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>📍 {vehicle.location}</div>}
          </div>
          <div className="d-flex gap-1">
            <button onClick={() => onToggle(vehicle)} className="btn btn-sm p-1 border-0" title={available ? 'Mark Unavailable' : 'Mark Available'} style={{ background: 'transparent', color: available ? '#16a34a' : '#94a3b8' }}>
              {available ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <button onClick={() => onEdit(vehicle)} className="btn btn-sm px-2 py-1 rounded-2" title="Edit Vehicle" style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '0.68rem' }}><Edit size={12} /></button>
            <button onClick={() => onDelete(vehicle.id, 'car')} className="btn btn-sm px-2 py-1 rounded-2" title="Delete Vehicle" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.68rem' }}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CAR_CATEGORIES = [
  'VIP Minivan (9-12 Seater)',
  'Standard Minivan (7-9 Seater)',
  'VIP Luxury Van (Alphard / Vellfire)',
  'Executive Sedan (Camry / Accord)',
  'Compact Sedan (Altis / Vios)',
  'Family SUV / MPV (Fortuner / Innova)',
  'Luxury VIP Limousine (Mercedes / BMW)',
  'Electric Transfer Cab (EV)',
  'Standard Cab (Sedan / Hatchback)'
];

function getSuggestedCategories(name) {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('commuter') || n.includes('hiace') || n.includes('van') || n.includes('staria') || n.includes('urvan') || n.includes('minivan')) {
    return ['VIP Minivan (9-12 Seater)', 'Standard Minivan (7-9 Seater)', 'VIP Luxury Van (Alphard / Vellfire)', 'Family SUV / MPV (Fortuner / Innova)'];
  }
  if (n.includes('alphard') || n.includes('vellfire') || n.includes('lexus') || n.includes('luxury van')) {
    return ['VIP Luxury Van (Alphard / Vellfire)', 'VIP Minivan (9-12 Seater)', 'Luxury VIP Limousine (Mercedes / BMW)'];
  }
  if (n.includes('camry') || n.includes('accord') || n.includes('teana') || n.includes('executive')) {
    return ['Executive Sedan (Camry / Accord)', 'Compact Sedan (Altis / Vios)', 'Luxury VIP Limousine (Mercedes / BMW)'];
  }
  if (n.includes('fortuner') || n.includes('innova') || n.includes('everest') || n.includes('mu-x') || n.includes('pajero') || n.includes('suv')) {
    return ['Family SUV / MPV (Fortuner / Innova)', 'Standard Minivan (7-9 Seater)', 'VIP Minivan (9-12 Seater)'];
  }
  if (n.includes('altis') || n.includes('vios') || n.includes('city') || n.includes('civic') || n.includes('yaris') || n.includes('sedan')) {
    return ['Compact Sedan (Altis / Vios)', 'Executive Sedan (Camry / Accord)', 'Standard Cab (Sedan / Hatchback)'];
  }
  if (n.includes('mercedes') || n.includes('bmw') || n.includes('benz') || n.includes('s-class') || n.includes('e-class') || n.includes('7 series') || n.includes('5 series') || n.includes('limousine')) {
    return ['Luxury VIP Limousine (Mercedes / BMW)', 'Executive Sedan (Camry / Accord)', 'VIP Luxury Van (Alphard / Vellfire)'];
  }
  if (n.includes('ev') || n.includes('electric') || n.includes('byd') || n.includes('atto') || n.includes('mg ep') || n.includes('tesla')) {
    return ['Electric Transfer Cab (EV)', 'Executive Sedan (Camry / Accord)', 'Compact Sedan (Altis / Vios)'];
  }
  return ['VIP Minivan (9-12 Seater)', 'Executive Sedan (Camry / Accord)', 'Family SUV / MPV (Fortuner / Innova)', 'Compact Sedan (Altis / Vios)', 'Standard Minivan (7-9 Seater)'];
}

const BIKE_KEYWORDS = ['scooter', 'bike', 'moped', 'activa', 'jupiter', 'bullet', 'ktm', 'ninja', 'pulsar', 'vespa'];
function isBikeItem(item) {
  if (!item) return false;
  if (item._type === 'bike' || item.type === 'bike') return true;
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  return BIKE_KEYWORDS.some(k => cat.includes(k) || name.includes(k));
}

export default function VehicleFleetManagement({ currentUser, cars = [], bikes = [], initialFilter, onAddCar, onAddBike, onUpdateCar, onUpdateBike, onDeleteCar, onDeleteBike }) {
  const [activeTab, setActiveTab] = useState(initialFilter || 'all');
  const [search, setSearch] = useState('');
  const [walletInfo, setWalletInfo] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      apiFetch(`${API_BASE}?resource=vendor_wallet_info&vendor_id=${currentUser.id}`)
        .then(r => r.json())
        .then(d => { if (d && !d.error) setWalletInfo(d); })
        .catch(console.error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (initialFilter) {
      setActiveTab(initialFilter);
    }
  }, [initialFilter]);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    fleet_quantity: 1,
    category: 'VIP Minivan (9-12 Seater)',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seating: '9 Seater (VIP Van)',
    engine: '2500cc',
    mileage: '14 km/l',
    location: 'Bangkok / Phuket, Thailand',
    registration_no: '',
    permit_type: 'Commercial Chauffeur Cab (Yellow Plate)',
    security_deposit: 2000,
    km_limit: 'Unlimited Kms',
    fuel_policy: 'Same-to-Same',
    has_fastag: true,
    has_ac: true,
    luggage_capacity: '4 Large Bags',
    delivery_options: 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
    min_age: 21,
    model_year: 2024,
    don_mueang_delivery_fee: 800,
    Suvarnabhumi_delivery_fee: 600,
    doorstep_delivery_fee: 300,
    insurance_valid_until: '',
    puc_valid_until: '',
    min_booking_days: 1,
    extra_km_rate: 15,
    late_return_fee_per_hour: 200,
    has_carplay_android_auto: true,
    has_reverse_camera: true,
    has_usb_charging: true,
    image: '',
    images: []
  });

  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    price: '',
    fleet_quantity: 1,
    category: 'VIP Minivan (9-12 Seater)',
    fuel: 'Petrol',
    transmission: 'Automatic',
    seating: '9 Seater (VIP Van)',
    engine: '2500cc',
    mileage: '14 km/l',
    location: 'Bangkok / Phuket, Thailand',
    registration_no: '',
    permit_type: 'Commercial Chauffeur Cab (Yellow Plate)',
    security_deposit: 2000,
    km_limit: 'Unlimited Kms',
    fuel_policy: 'Same-to-Same',
    has_fastag: true,
    has_ac: true,
    luggage_capacity: '4 Large Bags',
    delivery_options: 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
    min_age: 21,
    model_year: 2024,
    don_mueang_delivery_fee: 800,
    Suvarnabhumi_delivery_fee: 600,
    doorstep_delivery_fee: 300,
    insurance_valid_until: '',
    puc_valid_until: '',
    min_booking_days: 1,
    extra_km_rate: 15,
    late_return_fee_per_hour: 200,
    has_carplay_android_auto: true,
    has_reverse_camera: true,
    has_usb_charging: true,
    image: '',
    images: []
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Flexible Vehicle Vendor Inventory Isolation
  const isVehicleOwner = (v) => {
    if (!currentUser || currentUser.role !== 'vendor') return true;
    const vId = String(v?.vendor_id || v?.vendorId || '').trim().toLowerCase();
    const uId = String(currentUser?.id || '').trim().toLowerCase();
    const uName = String(currentUser?.username || '').trim().toLowerCase();
    const uVendorId = String(currentUser?.vendor_id || '').trim().toLowerCase();
    if (vId && (vId === uId || vId === uName || (uVendorId && vId === uVendorId))) return true;
    const isMainVendor = uId === 'u-4' || uName === 'vendor';
    if (isMainVendor && (vId === 'u-4' || vId === 'vendor' || vId === 'vendor-1' || vId === 'vendor-2' || !vId)) return true;
    return false;
  };

  const displayCars = (cars || []).filter(isVehicleOwner).filter(c => !isBikeItem(c));
  const allCombined = displayCars.map(v => ({ ...v, _type: 'car' }));
  const availableCount = allCombined.filter(v => v.is_available !== 0 && v.is_available !== false && v.is_available !== '0').length;
  const unavailableCount = allCombined.filter(v => v.is_available === 0 || v.is_available === false || v.is_available === '0').length;

  const filtered = (() => {
    let src = allCombined;
    if (activeTab === 'available') src = allCombined.filter(v => v.is_available !== 0 && v.is_available !== false && v.is_available !== '0');
    else if (activeTab === 'unavailable') src = allCombined.filter(v => v.is_available === 0 || v.is_available === false || v.is_available === '0');
    return src.filter(v => (v.name || '').toLowerCase().includes(search.toLowerCase()));
  })();

  const handleImageUpload = async (e, isEdit = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalid = files.find(f => !validTypes.includes(f.type));
    if (invalid) {
      setUploadError('Please select valid image files (JPG, PNG, WEBP, GIF).');
      return;
    }

    setUploadingImage(true);
    setUploadError('');

    try {
      const uploadPromises = files.map(file => uploadImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);

      if (isEdit) {
        setEditForm(prev => {
          const currentImages = prev.images && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : []);
          const merged = [...currentImages, ...uploadedUrls];
          return {
            ...prev,
            images: merged,
            image: merged[0] || ''
          };
        });
      } else {
        setAddForm(prev => {
          const currentImages = prev.images && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : []);
          const merged = [...currentImages, ...uploadedUrls];
          return {
            ...prev,
            images: merged,
            image: merged[0] || ''
          };
        });
      }
    } catch (err) {
      setUploadError('Image upload failed: ' + (err.message || 'Server error'));
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => {
        const updated = (prev.images || []).filter((_, i) => i !== index);
        return {
          ...prev,
          images: updated,
          image: updated[0] || ''
        };
      });
    } else {
      setAddForm(prev => {
        const updated = (prev.images || []).filter((_, i) => i !== index);
        return {
          ...prev,
          images: updated,
          image: updated[0] || ''
        };
      });
    }
  };

  const setPrimaryImage = (index, isEdit = false) => {
    if (index === 0) return;
    if (isEdit) {
      setEditForm(prev => {
        const list = [...(prev.images || [])];
        const [chosen] = list.splice(index, 1);
        list.unshift(chosen);
        return {
          ...prev,
          images: list,
          image: list[0] || ''
        };
      });
    } else {
      setAddForm(prev => {
        const list = [...(prev.images || [])];
        const [chosen] = list.splice(index, 1);
        list.unshift(chosen);
        return {
          ...prev,
          images: list,
          image: list[0] || ''
        };
      });
    }
  };

  const handleToggle = async (vehicle) => {
    try {
      const isCurrentlyAvail = vehicle.is_available !== 0 && vehicle.is_available !== false && vehicle.is_available !== '0';
      const newState = !isCurrentlyAvail;
      await toggleVehicleAvailability(vehicle.id, 'car', newState);
      if (onUpdateCar) {
        onUpdateCar({ ...vehicle, is_available: newState ? 1 : 0 });
      }
    } catch (e) {
      alert('Failed to update availability: ' + e.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.price) {
      alert('Vehicle name and price are required.');
      return;
    }
    setSaving(true);
    try {
      const imagesList = editForm.images && editForm.images.length > 0 ? editForm.images : (editForm.image ? [editForm.image] : []);
      const primaryImage = imagesList[0] || editForm.image || '';

      const updatedData = {
        id: editing.id,
        type: 'car',
        name: editForm.name,
        price: parseInt(editForm.price, 10),
        fleet_quantity: parseInt(editForm.fleet_quantity, 10) || 1,
        category: editForm.category,
        fuel: editForm.fuel,
        transmission: editForm.transmission,
        seating: editForm.seating,
        engine: editForm.engine,
        mileage: editForm.mileage,
        location: editForm.location,
        registration_no: editForm.registration_no || '',
        permit_type: editForm.permit_type || 'Commercial Chauffeur Cab (Yellow Plate)',
        security_deposit: parseInt(editForm.security_deposit, 10) || 2000,
        km_limit: editForm.km_limit || 'Unlimited Kms',
        fuel_policy: editForm.fuel_policy || 'Same-to-Same',
        has_fastag: Boolean(editForm.has_fastag),
        has_ac: Boolean(editForm.has_ac),
        luggage_capacity: editForm.luggage_capacity || '4 Large Bags',
        delivery_options: editForm.delivery_options || 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
        min_age: parseInt(editForm.min_age, 10) || 21,
        model_year: parseInt(editForm.model_year, 10) || 2024,
        don_mueang_delivery_fee: parseInt(editForm.don_mueang_delivery_fee, 10) || 800,
        Suvarnabhumi_delivery_fee: parseInt(editForm.Suvarnabhumi_delivery_fee, 10) || 600,
        doorstep_delivery_fee: parseInt(editForm.doorstep_delivery_fee, 10) || 300,
        insurance_valid_until: editForm.insurance_valid_until || '',
        puc_valid_until: editForm.puc_valid_until || '',
        min_booking_days: parseInt(editForm.min_booking_days, 10) || 1,
        extra_km_rate: parseInt(editForm.extra_km_rate, 10) || 15,
        late_return_fee_per_hour: parseInt(editForm.late_return_fee_per_hour, 10) || 200,
        has_carplay_android_auto: Boolean(editForm.has_carplay_android_auto),
        has_reverse_camera: Boolean(editForm.has_reverse_camera),
        has_usb_charging: Boolean(editForm.has_usb_charging),
        image: primaryImage,
        images: imagesList,
        images_json: JSON.stringify(imagesList)
      };

      if (onUpdateCar) await onUpdateCar(updatedData);
      else await updateVehicle(updatedData);
      setEditing(null);
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;
    try {
      if (onDeleteCar) await onDeleteCar(id);
      else await deleteVehicle(id, 'car');
    } catch (e) {
      alert('Failed to delete vehicle: ' + e.message);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.price) {
      alert('Vehicle name and price are required.');
      return;
    }
    setSaving(true);
    try {
      const imagesList = addForm.images && addForm.images.length > 0 ? addForm.images : (addForm.image ? [addForm.image] : []);
      const primaryImage = imagesList[0] || addForm.image || '';

      const newVehicleData = {
        ...addForm,
        type: 'car',
        price: parseInt(addForm.price, 10),
        fleet_quantity: parseInt(addForm.fleet_quantity, 10) || 1,
        registration_no: addForm.registration_no || '',
        permit_type: addForm.permit_type || 'Commercial Chauffeur Cab (Yellow Plate)',
        security_deposit: parseInt(addForm.security_deposit, 10) || 2000,
        km_limit: addForm.km_limit || 'Unlimited Kms',
        fuel_policy: addForm.fuel_policy || 'Same-to-Same',
        has_fastag: Boolean(addForm.has_fastag),
        has_ac: Boolean(addForm.has_ac),
        luggage_capacity: addForm.luggage_capacity || '4 Large Bags',
        delivery_options: addForm.delivery_options || 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
        min_age: parseInt(addForm.min_age, 10) || 21,
        model_year: parseInt(addForm.model_year, 10) || 2024,
        don_mueang_delivery_fee: parseInt(addForm.don_mueang_delivery_fee, 10) || 800,
        Suvarnabhumi_delivery_fee: parseInt(addForm.Suvarnabhumi_delivery_fee, 10) || 600,
        doorstep_delivery_fee: parseInt(addForm.doorstep_delivery_fee, 10) || 300,
        insurance_valid_until: addForm.insurance_valid_until || '',
        puc_valid_until: addForm.puc_valid_until || '',
        min_booking_days: parseInt(addForm.min_booking_days, 10) || 1,
        extra_km_rate: parseInt(addForm.extra_km_rate, 10) || 15,
        late_return_fee_per_hour: parseInt(addForm.late_return_fee_per_hour, 10) || 200,
        has_carplay_android_auto: Boolean(addForm.has_carplay_android_auto),
        has_reverse_camera: Boolean(addForm.has_reverse_camera),
        has_usb_charging: Boolean(addForm.has_usb_charging),
        image: primaryImage,
        images: imagesList,
        images_json: JSON.stringify(imagesList),
        vendorId: currentUser?.id || currentUser?.username || 'vendor-1'
      };

      if (onAddCar) {
        await onAddCar(newVehicleData);
      }
      setShowAdd(false);
      setAddForm({
        name: '',
        price: '',
        fleet_quantity: 1,
        category: 'VIP Minivan (9-12 Seater)',
        fuel: 'Petrol',
        transmission: 'Automatic',
        seating: '9 Seater (VIP Van)',
        engine: '2500cc',
        mileage: '14 km/l',
        location: 'Bangkok / Phuket, Thailand',
        registration_no: '',
        permit_type: 'Commercial Chauffeur Cab (Yellow Plate)',
        security_deposit: 2000,
        km_limit: 'Unlimited Kms',
        fuel_policy: 'Same-to-Same',
        has_fastag: true,
        has_ac: true,
        luggage_capacity: '4 Large Bags',
        delivery_options: 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
        min_age: 21,
        model_year: 2024,
        don_mueang_delivery_fee: 800,
        Suvarnabhumi_delivery_fee: 600,
        doorstep_delivery_fee: 300,
        insurance_valid_until: '',
        puc_valid_until: '',
        min_booking_days: 1,
        extra_km_rate: 15,
        late_return_fee_per_hour: 200,
        has_carplay_android_auto: true,
        has_reverse_camera: true,
        has_usb_charging: true,
        image: '',
        images: []
      });
      setUploadError('');
    } catch (e) {
      alert('Failed to add vehicle: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const currentAddCategories = CAR_CATEGORIES;
  const currentAddSuggestions = getSuggestedCategories(addForm.name);

  const currentEditCategories = CAR_CATEGORIES;
  const currentEditSuggestions = getSuggestedCategories(editForm.name);

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 className="fw-bold mb-0" style={{ color: '#0D1B2E', fontSize: '16px' }}>Cab &amp; Transfer Fleet Management</h5>
          <p className="mb-0 mt-1" style={{ fontSize: '0.78rem', color: '#64748b' }}>{displayCars.length} transfer vehicles in your fleet</p>
        </div>
        <button onClick={() => { setShowAdd(true); setUploadError(''); }} className="btn px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 rounded-3 shadow-sm" style={{ background: 'linear-gradient(90deg,#FF6333,#FF8A00)', fontSize: '0.83rem' }}>
          <Plus size={14} /> Add Cab / Vehicle
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {[
          { id: 'all', label: `All Vehicles (${displayCars.length})` },
          { id: 'available', label: `Available (${availableCount})` },
          { id: 'unavailable', label: `Unavailable (${unavailableCount})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="btn btn-sm px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '0.78rem', background: activeTab === t.id ? '#0D1B2E' : '#fff', color: activeTab === t.id ? '#fff' : '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>
            {t.label}
          </button>
        ))}
        <div className="position-relative ms-auto" style={{ minWidth: '220px' }}>
          <Search size={14} className="position-absolute" style={{ top: '50%', left: '10px', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-control form-control-sm" style={{ paddingLeft: '30px', borderRadius: '10px', fontSize: '0.82rem' }} placeholder="Search transfer fleet..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Grid */}
      <div className="row g-3">
        {filtered.map(v => (
          <div key={`cab-${v.id}`} className="col-sm-6 col-md-4 col-xl-3">
            <VehicleCard
              vehicle={v}
              type="car"
              onEdit={veh => {
                setEditing(veh);
                let initialImages = [];
                if (veh.images_json) {
                  try {
                    const parsed = JSON.parse(veh.images_json);
                    if (Array.isArray(parsed) && parsed.length > 0) initialImages = parsed;
                  } catch (e) {}
                }
                if (initialImages.length === 0 && veh.image) {
                  initialImages = [veh.image];
                }

                setEditForm({
                  name: veh.name || '',
                  price: veh.price || '',
                  fleet_quantity: veh.fleet_count || 1,
                  category: veh.category || 'VIP Minivan (9-12 Seater)',
                  fuel: veh.fuel || 'Petrol',
                  transmission: veh.transmission || 'Automatic',
                  seating: veh.seating || '9 Seater (VIP Van)',
                  engine: veh.engine || '2500cc',
                  mileage: veh.mileage || '14 km/l',
                  location: veh.location || 'Bangkok / Phuket, Thailand',
                  registration_no: veh.registration_no || '',
                  permit_type: veh.permit_type || 'Commercial Chauffeur Cab (Yellow Plate)',
                  security_deposit: veh.security_deposit !== undefined ? veh.security_deposit : 2000,
                  km_limit: veh.km_limit || 'Unlimited Kms',
                  fuel_policy: veh.fuel_policy || 'Same-to-Same',
                  has_fastag: veh.has_fastag !== undefined ? Boolean(Number(veh.has_fastag)) : true,
                  has_ac: veh.has_ac !== undefined ? Boolean(Number(veh.has_ac)) : true,
                  luggage_capacity: veh.luggage_capacity || '4 Large Bags',
                  delivery_options: veh.delivery_options || 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels',
                  min_age: veh.min_age || 21,
                  model_year: veh.model_year || 2024,
                  don_mueang_delivery_fee: veh.don_mueang_delivery_fee !== undefined ? veh.don_mueang_delivery_fee : 800,
                  Suvarnabhumi_delivery_fee: veh.Suvarnabhumi_delivery_fee !== undefined ? veh.Suvarnabhumi_delivery_fee : 600,
                  doorstep_delivery_fee: veh.doorstep_delivery_fee !== undefined ? veh.doorstep_delivery_fee : 300,
                  insurance_valid_until: veh.insurance_valid_until || '',
                  puc_valid_until: veh.puc_valid_until || '',
                  min_booking_days: veh.min_booking_days || 1,
                  extra_km_rate: veh.extra_km_rate !== undefined ? veh.extra_km_rate : 15,
                  late_return_fee_per_hour: veh.late_return_fee_per_hour !== undefined ? veh.late_return_fee_per_hour : 200,
                  has_carplay_android_auto: veh.has_carplay_android_auto !== undefined ? Boolean(Number(veh.has_carplay_android_auto)) : true,
                  has_reverse_camera: veh.has_reverse_camera !== undefined ? Boolean(Number(veh.has_reverse_camera)) : true,
                  has_usb_charging: veh.has_usb_charging !== undefined ? Boolean(Number(veh.has_usb_charging)) : true,
                  image: initialImages[0] || veh.image || '',
                  images: initialImages
                });
                setUploadError('');
              }}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isSuspended={Number(walletInfo?.services_suspended) === 1}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-12 text-center py-5">
            <span style={{ fontSize: '3rem' }}>🚐</span>
            <div className="mt-2 fw-bold" style={{ color: '#64748b' }}>No transfer vehicles found</div>
            <button onClick={() => { setShowAdd(true); setUploadError(''); }} className="btn mt-3 px-4 py-2 rounded-3 fw-bold text-white" style={{ background: 'linear-gradient(90deg,#FF6333,#FF8A00)', fontSize: '0.83rem' }}>
              <Plus size={14} className="me-2" /> Add First Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-2 p-md-3" style={{ background: 'rgba(13,27,46,0.65)', backdropFilter: 'blur(6px)', zIndex: 1060 }} onClick={() => setEditing(null)}>
          <div className="rounded-4 shadow-lg d-flex flex-column" style={{ width: '100%', maxWidth: '580px', background: '#fff', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between px-4 py-3 flex-shrink-0" style={{ background: '#0D1B2E' }}>
              <h6 className="mb-0 fw-bold text-white" style={{ fontSize: '14px' }}>Edit Transfer Cab — {editing.name}</h6>
              <button className="btn p-1 border-0 text-white-50" onClick={() => setEditing(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
              <div className="p-4 flex-grow-1 vehicle-modal-scrollbar" style={{ overflowY: 'auto', minHeight: 0 }}>
              <div className="row g-2 mb-3">
                <div className="col-12">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Vehicle Model &amp; Make *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                    value={editForm.name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm(f => ({ ...f, name: val }));
                    }}
                    placeholder="e.g. Toyota Commuter VIP Van"
                    required
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Rate/Day (฿) *</label>
                  <input type="number" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.price || ''} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Fleet Qty *</label>
                  <input type="number" min="1" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.fleet_quantity || 1} onChange={e => setEditForm(f => ({ ...f, fleet_quantity: e.target.value }))} required />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Model Year *</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.model_year || 2024} onChange={e => setEditForm(f => ({ ...f, model_year: e.target.value }))}>
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Category with Smart Suggestions */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-bold mb-0" style={{ fontSize: '0.78rem', color: '#475569' }}>Vehicle Category *</label>
                  <span className="fw-semibold" style={{ fontSize: '0.7rem', color: '#FF6333' }}>
                    💡 Suggestions for "{editForm.name || 'Cab'}"
                  </span>
                </div>
                <select
                  className="form-select mb-1"
                  style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                  value={editForm.category || 'VIP Minivan (9-12 Seater)'}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                >
                  {currentEditCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="d-flex flex-wrap gap-1 align-items-center mt-1">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.68rem', marginRight: '4px' }}>Quick Select:</span>
                  {currentEditSuggestions.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, category: cat }))}
                      className="btn btn-sm py-0 px-2 rounded-pill fw-bold"
                      style={{
                        fontSize: '0.7rem',
                        background: editForm.category === cat ? 'linear-gradient(90deg,#FF6333,#FF8A00)' : '#f1f5f9',
                        color: editForm.category === cat ? '#fff' : '#334155',
                        border: editForm.category === cat ? 'none' : '1px solid #cbd5e1'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Fuel Type</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.fuel || 'Diesel'} onChange={e => setEditForm(f => ({ ...f, fuel: e.target.value }))}>
                    {['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Transmission</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.transmission || 'Automatic'} onChange={e => setEditForm(f => ({ ...f, transmission: e.target.value }))}>
                    {['Automatic', 'Manual'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Passenger Seating Capacity</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.seating || '9 Seater (VIP Van)'} onChange={e => setEditForm(f => ({ ...f, seating: e.target.value }))}>
                    {['4 Seater (Sedan)', '5 Seater (SUV)', '7 Seater (MPV)', '9 Seater (VIP Van)', '10 Seater (Minivan)', '12 Seater (Commuter Van)', '14 Seater (Minibus)'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Service Area / Location</label>
                  <input type="text" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={editForm.location || 'Bangkok / Phuket, Thailand'} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Bangkok &amp; Pattaya, Thailand" />
                </div>
              </div>

              {/* Registration & Thailand Permit */}
              <div className="p-3 rounded-3 mb-3 border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className="d-flex align-items-center gap-1.5 mb-2">
                  <ShieldCheck size={16} className="text-success" />
                  <span className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>Registration &amp; Thailand Legal Transport Permit</span>
                  <span className="badge bg-success bg-opacity-10 text-success ms-auto" style={{ fontSize: '0.62rem' }}>Department of Land Transport (DLT)</span>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Registration Plate Number (Thai)
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase font-monospace fw-bold"
                      style={{ fontSize: '0.85rem', borderRadius: '8px', letterSpacing: '0.5px' }}
                      value={editForm.registration_no || ''}
                      onChange={e => setEditForm(f => ({ ...f, registration_no: e.target.value }))}
                      placeholder="e.g. 1กข 4567 Bangkok"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Permit Type
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={editForm.permit_type || 'Commercial Chauffeur Cab (Yellow Plate)'}
                      onChange={e => setEditForm(f => ({ ...f, permit_type: e.target.value }))}
                    >
                      <option value="Commercial Chauffeur Cab (Yellow Plate)">Commercial Chauffeur Cab (Yellow Plate)</option>
                      <option value="Airport Transfer & Tour Permit (Green Plate)">Airport Transfer & Tour Permit (Green Plate)</option>
                      <option value="Commercial Van / Minibus Permit (Yellow Plate)">Commercial Van / Minibus Permit (Yellow Plate)</option>
                      <option value="Private Commercial Chauffeur Permit">Private Commercial Chauffeur Permit</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 pt-1 border-top">
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Commercial Passenger Insurance Valid Until
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={editForm.insurance_valid_until || ''}
                      onChange={e => setEditForm(f => ({ ...f, insurance_valid_until: e.target.value }))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Vehicle Safety Inspection Valid Until
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={editForm.puc_valid_until || ''}
                      onChange={e => setEditForm(f => ({ ...f, puc_valid_until: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Inclusions & Features */}
              <div className="p-3 rounded-3 mb-3 border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className="d-flex align-items-center gap-1.5 mb-2">
                  <Key size={16} className="text-warning" />
                  <span className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>Vehicle Amenities &amp; Transfer Options</span>
                </div>
                
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Security Deposit (฿) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                      value={editForm.security_deposit !== undefined ? editForm.security_deposit : ''}
                      onChange={e => setEditForm(f => ({ ...f, security_deposit: e.target.value }))}
                      placeholder="2000"
                    />
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>Optional deposit for chauffeur transfers</span>
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Luggage Capacity
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                      value={editForm.luggage_capacity || '4 Large Bags'}
                      onChange={e => setEditForm(f => ({ ...f, luggage_capacity: e.target.value }))}
                      placeholder="e.g. 4 Large Bags, 3 Cabin Bags"
                    />
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="d-flex flex-wrap gap-3 mt-2 pt-2 border-top">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="edit_has_ac"
                      checked={Boolean(editForm.has_ac)}
                      onChange={e => setEditForm(f => ({ ...f, has_ac: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="edit_has_ac" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      ❄️ Air Conditioning (AC) Guaranteed
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="edit_has_fastag"
                      checked={Boolean(editForm.has_fastag)}
                      onChange={e => setEditForm(f => ({ ...f, has_fastag: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="edit_has_fastag" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      ⚡ Easy Pass / Toll Tag Enabled
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="edit_has_carplay"
                      checked={Boolean(editForm.has_carplay_android_auto)}
                      onChange={e => setEditForm(f => ({ ...f, has_carplay_android_auto: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="edit_has_carplay" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      📱 Apple CarPlay / Android Auto
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="edit_has_revcam"
                      checked={Boolean(editForm.has_reverse_camera)}
                      onChange={e => setEditForm(f => ({ ...f, has_reverse_camera: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="edit_has_revcam" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      📷 Reverse Parking Camera
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="edit_has_usb_car"
                      checked={Boolean(editForm.has_usb_charging)}
                      onChange={e => setEditForm(f => ({ ...f, has_usb_charging: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="edit_has_usb_car" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      🔌 USB Fast Charger Ports
                    </label>
                  </div>
                </div>

                {/* Handover locations info */}
                <div className="mt-2 pt-2 border-top">
                  <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                    Supported Pickup / Drop-off Hubs
                  </label>
                  <input
                    type="text"
                    className="form-control mb-2"
                    style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                    value={editForm.delivery_options || 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels'}
                    onChange={e => setEditForm(f => ({ ...f, delivery_options: e.target.value }))}
                    placeholder="e.g. Suvarnabhumi Airport (BKK), Don Mueang (DMK), Bangkok Downtown"
                  />

                  <div className="row g-2">
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        ✈️ Don Mueang (DMK) (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={editForm.don_mueang_delivery_fee !== undefined ? editForm.don_mueang_delivery_fee : ''}
                        onChange={e => setEditForm(f => ({ ...f, don_mueang_delivery_fee: e.target.value }))}
                        placeholder="800"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        ✈️ Suvarnabhumi (BKK) (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={editForm.Suvarnabhumi_delivery_fee !== undefined ? editForm.Suvarnabhumi_delivery_fee : ''}
                        onChange={e => setEditForm(f => ({ ...f, Suvarnabhumi_delivery_fee: e.target.value }))}
                        placeholder="600"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        🏨 Hotel Doorstep (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={editForm.doorstep_delivery_fee !== undefined ? editForm.doorstep_delivery_fee : ''}
                        onChange={e => setEditForm(f => ({ ...f, doorstep_delivery_fee: e.target.value }))}
                        placeholder="300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-3">
                <label className="form-label fw-bold d-flex align-items-center justify-content-between" style={{ fontSize: '0.78rem', color: '#475569' }}>
                  <span>Vehicle Images ({editForm.images?.length || 0} selected)</span>
                  {uploadingImage && <span className="text-primary d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}><Loader2 size={12} className="spinner-border spinner-border-sm" /> Uploading images...</span>}
                </label>

                <div className="p-3 rounded-3 mb-2" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold" style={{ fontSize: '0.82rem', color: '#0D1B2E' }}>Select Vehicle Photos</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Upload high-resolution exterior and interior photos</div>
                    </div>
                    <div>
                      <input
                        type="file"
                        multiple
                        ref={editFileInputRef}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={e => handleImageUpload(e, true)}
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => editFileInputRef.current?.click()}
                        className="btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-1"
                        style={{ background: '#0D1B2E', color: '#fff', fontSize: '0.78rem' }}
                      >
                        <Upload size={13} /> {editForm.images?.length > 0 ? '+ Add More Photos' : 'Choose Photos from Computer'}
                      </button>
                    </div>
                  </div>
                </div>

                {editForm.images && editForm.images.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 p-2 rounded-3" style={{ background: '#f1f5f9', maxHeight: '170px', overflowY: 'auto' }}>
                    {editForm.images.map((imgUrl, idx) => (
                      <div key={idx} className="position-relative rounded-2 overflow-hidden shadow-sm" style={{ width: '82px', height: '65px', border: idx === 0 ? '2px solid #16a34a' : '1px solid #cbd5e1' }}>
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <span className="position-absolute top-0 start-0 badge bg-success" style={{ fontSize: '0.52rem', padding: '2px 4px', borderRadius: '0 0 4px 0' }}>
                            Primary
                          </span>
                        )}
                        <div className="position-absolute top-0 end-0 d-flex gap-1 p-1">
                          {idx !== 0 && (
                            <button type="button" onClick={() => setPrimaryImage(idx, true)} className="btn btn-dark btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center" title="Set as primary cover photo" style={{ width: '18px', height: '18px', fontSize: '0.6rem', opacity: 0.85 }}>
                              <Star size={9} style={{ color: '#fbbf24' }} />
                            </button>
                          )}
                          <button type="button" onClick={() => removeImage(idx, true)} className="btn btn-danger btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center" title="Remove photo" style={{ width: '18px', height: '18px', fontSize: '0.6rem', opacity: 0.85 }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {uploadError && <div className="text-danger mt-1" style={{ fontSize: '0.72rem' }}>{uploadError}</div>}
              </div>
            </div>

            <div className="px-4 py-3 flex-shrink-0 border-top bg-white">
                <button type="submit" disabled={saving || uploadingImage} className="btn w-100 py-2.5 fw-bold text-white rounded-3 d-flex align-items-center justify-content-center gap-2" style={{ background: 'linear-gradient(90deg,#FF6333,#FF8A00)' }}>
                  <Save size={14} />{saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-2 p-md-3" style={{ background: 'rgba(13,27,46,0.65)', backdropFilter: 'blur(6px)', zIndex: 1060 }} onClick={() => setShowAdd(false)}>
          <div className="rounded-4 shadow-lg d-flex flex-column" style={{ width: '100%', maxWidth: '580px', background: '#fff', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between px-4 py-3 flex-shrink-0" style={{ background: '#0D1B2E' }}>
              <h6 className="mb-0 fw-bold text-white" style={{ fontSize: '14px' }}>Add Transfer Vehicle to Fleet</h6>
              <button className="btn p-1 border-0 text-white-50" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd} className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
              <div className="p-4 flex-grow-1 vehicle-modal-scrollbar" style={{ overflowY: 'auto', minHeight: 0 }}>
              
              {/* Category banner */}
              <div className="d-flex align-items-center gap-2 mb-3 p-2.5 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.2rem' }}>🚐</span>
                <div>
                  <div className="fw-bold" style={{ fontSize: '0.82rem', color: '#0D1B2E' }}>Thailand Cab &amp; Chauffeur Transfer Fleet</div>
                  <div style={{ fontSize: '0.70rem', color: '#64748b' }}>Configure professional chauffeur-driven transfer vehicles (Sedans, SUVs, VIP Vans)</div>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-12">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Vehicle Model &amp; Make *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                    value={addForm.name}
                    onChange={e => {
                      const val = e.target.value;
                      setAddForm(f => ({ ...f, name: val }));
                    }}
                    placeholder="e.g. Toyota Commuter VIP Van"
                    required
                  />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Rate/Day (฿) *</label>
                  <input type="number" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 2500" required />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Fleet Qty *</label>
                  <input type="number" min="1" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.fleet_quantity || 1} onChange={e => setAddForm(f => ({ ...f, fleet_quantity: e.target.value }))} required />
                </div>
                <div className="col-4">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Model Year *</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.model_year || 2024} onChange={e => setAddForm(f => ({ ...f, model_year: e.target.value }))}>
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Category with Smart Suggestions */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-bold mb-0" style={{ fontSize: '0.78rem', color: '#475569' }}>Vehicle Category *</label>
                  <span className="fw-semibold" style={{ fontSize: '0.7rem', color: '#FF6333' }}>
                    💡 Suggestions for "{addForm.name || 'Cab'}"
                  </span>
                </div>
                <select
                  className="form-select mb-1"
                  style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                >
                  {currentAddCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="d-flex flex-wrap gap-1 align-items-center mt-1">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.68rem', marginRight: '4px' }}>Quick Select:</span>
                  {currentAddSuggestions.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAddForm(f => ({ ...f, category: cat }))}
                      className="btn btn-sm py-0 px-2 rounded-pill fw-bold"
                      style={{
                        fontSize: '0.7rem',
                        background: addForm.category === cat ? 'linear-gradient(90deg,#FF6333,#FF8A00)' : '#f1f5f9',
                        color: addForm.category === cat ? '#fff' : '#334155',
                        border: addForm.category === cat ? 'none' : '1px solid #cbd5e1'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Fuel Type</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.fuel} onChange={e => setAddForm(f => ({ ...f, fuel: e.target.value }))}>
                    {['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Transmission</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.transmission} onChange={e => setAddForm(f => ({ ...f, transmission: e.target.value }))}>
                    {['Automatic', 'Manual'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Passenger Seating Capacity</label>
                  <select className="form-select" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.seating} onChange={e => setAddForm(f => ({ ...f, seating: e.target.value }))}>
                    {['4 Seater (Sedan)', '5 Seater (SUV)', '7 Seater (MPV)', '9 Seater (VIP Van)', '10 Seater (Minivan)', '12 Seater (Commuter Van)', '14 Seater (Minibus)'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold" style={{ fontSize: '0.78rem', color: '#475569' }}>Service Area / Location</label>
                  <input type="text" className="form-control" style={{ fontSize: '0.85rem', borderRadius: '8px' }} value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Bangkok / Phuket, Thailand" />
                </div>
              </div>

              {/* Registration & Thailand Permit */}
              <div className="p-3 rounded-3 mb-3 border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className="d-flex align-items-center gap-1.5 mb-2">
                  <ShieldCheck size={16} className="text-success" />
                  <span className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>Registration &amp; Thailand Legal Transport Permit</span>
                  <span className="badge bg-success bg-opacity-10 text-success ms-auto" style={{ fontSize: '0.62rem' }}>Department of Land Transport (DLT)</span>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Registration Plate Number (Thai)
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase font-monospace fw-bold"
                      style={{ fontSize: '0.85rem', borderRadius: '8px', letterSpacing: '0.5px' }}
                      value={addForm.registration_no || ''}
                      onChange={e => setAddForm(f => ({ ...f, registration_no: e.target.value }))}
                      placeholder="e.g. 1กข 4567 Bangkok"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Permit Type
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={addForm.permit_type || 'Commercial Chauffeur Cab (Yellow Plate)'}
                      onChange={e => setAddForm(f => ({ ...f, permit_type: e.target.value }))}
                    >
                      <option value="Commercial Chauffeur Cab (Yellow Plate)">Commercial Chauffeur Cab (Yellow Plate)</option>
                      <option value="Airport Transfer & Tour Permit (Green Plate)">Airport Transfer & Tour Permit (Green Plate)</option>
                      <option value="Commercial Van / Minibus Permit (Yellow Plate)">Commercial Van / Minibus Permit (Yellow Plate)</option>
                      <option value="Private Commercial Chauffeur Permit">Private Commercial Chauffeur Permit</option>
                    </select>
                  </div>
                </div>

                <div className="row g-2 pt-1 border-top">
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Commercial Passenger Insurance Valid Until
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={addForm.insurance_valid_until || ''}
                      onChange={e => setAddForm(f => ({ ...f, insurance_valid_until: e.target.value }))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Vehicle Safety Inspection Valid Until
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                      value={addForm.puc_valid_until || ''}
                      onChange={e => setAddForm(f => ({ ...f, puc_valid_until: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Inclusions & Features */}
              <div className="p-3 rounded-3 mb-3 border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div className="d-flex align-items-center gap-1.5 mb-2">
                  <Key size={16} className="text-warning" />
                  <span className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>Vehicle Amenities &amp; Transfer Options</span>
                </div>
                
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Security Deposit (฿) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                      value={addForm.security_deposit !== undefined ? addForm.security_deposit : ''}
                      onChange={e => setAddForm(f => ({ ...f, security_deposit: e.target.value }))}
                      placeholder="2000"
                    />
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>Optional deposit for chauffeur transfers</span>
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                      Luggage Capacity
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.85rem', borderRadius: '8px' }}
                      value={addForm.luggage_capacity || '4 Large Bags'}
                      onChange={e => setAddForm(f => ({ ...f, luggage_capacity: e.target.value }))}
                      placeholder="e.g. 4 Large Bags, 3 Cabin Bags"
                    />
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="d-flex flex-wrap gap-3 mt-2 pt-2 border-top">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="add_has_ac"
                      checked={Boolean(addForm.has_ac)}
                      onChange={e => setAddForm(f => ({ ...f, has_ac: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="add_has_ac" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      ❄️ Air Conditioning (AC) Guaranteed
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="add_has_fastag"
                      checked={Boolean(addForm.has_fastag)}
                      onChange={e => setAddForm(f => ({ ...f, has_fastag: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="add_has_fastag" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      ⚡ Easy Pass / Toll Tag Enabled
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="add_has_carplay"
                      checked={Boolean(addForm.has_carplay_android_auto)}
                      onChange={e => setAddForm(f => ({ ...f, has_carplay_android_auto: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="add_has_carplay" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      📱 Apple CarPlay / Android Auto
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="add_has_revcam"
                      checked={Boolean(addForm.has_reverse_camera)}
                      onChange={e => setAddForm(f => ({ ...f, has_reverse_camera: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="add_has_revcam" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      📷 Reverse Parking Camera
                    </label>
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      id="add_has_usb_car"
                      checked={Boolean(addForm.has_usb_charging)}
                      onChange={e => setAddForm(f => ({ ...f, has_usb_charging: e.target.checked }))}
                    />
                    <label className="form-check-label fw-semibold cursor-pointer" htmlFor="add_has_usb_car" style={{ fontSize: '0.75rem', color: '#334155' }}>
                      🔌 USB Fast Charger Ports
                    </label>
                  </div>
                </div>

                {/* Handover locations info */}
                <div className="mt-2 pt-2 border-top">
                  <label className="form-label fw-bold mb-1" style={{ fontSize: '0.74rem', color: '#475569' }}>
                    Supported Pickup / Drop-off Hubs
                  </label>
                  <input
                    type="text"
                    className="form-control mb-2"
                    style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                    value={addForm.delivery_options || 'Suvarnabhumi Airport (BKK), Don Mueang Airport (DMK), Bangkok Hotels'}
                    onChange={e => setAddForm(f => ({ ...f, delivery_options: e.target.value }))}
                    placeholder="e.g. Suvarnabhumi Airport (BKK), Don Mueang (DMK), Bangkok Downtown"
                  />

                  <div className="row g-2">
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        ✈️ Don Mueang (DMK) (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={addForm.don_mueang_delivery_fee !== undefined ? addForm.don_mueang_delivery_fee : ''}
                        onChange={e => setAddForm(f => ({ ...f, don_mueang_delivery_fee: e.target.value }))}
                        placeholder="800"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        ✈️ Suvarnabhumi (BKK) (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={addForm.Suvarnabhumi_delivery_fee !== undefined ? addForm.Suvarnabhumi_delivery_fee : ''}
                        onChange={e => setAddForm(f => ({ ...f, Suvarnabhumi_delivery_fee: e.target.value }))}
                        placeholder="600"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        🏨 Hotel Doorstep (฿)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        style={{ fontSize: '0.82rem', borderRadius: '8px' }}
                        value={addForm.doorstep_delivery_fee !== undefined ? addForm.doorstep_delivery_fee : ''}
                        onChange={e => setAddForm(f => ({ ...f, doorstep_delivery_fee: e.target.value }))}
                        placeholder="300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-4">
                <label className="form-label fw-bold d-flex align-items-center justify-content-between" style={{ fontSize: '0.78rem', color: '#475569' }}>
                  <span>Vehicle Images ({addForm.images?.length || 0} selected)</span>
                  {uploadingImage && <span className="text-primary d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}><Loader2 size={12} className="spinner-border spinner-border-sm" /> Uploading images...</span>}
                </label>

                <div className="p-3 rounded-3 mb-2" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold" style={{ fontSize: '0.82rem', color: '#0D1B2E' }}>Select Vehicle Photos</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Upload high-resolution exterior and interior photos</div>
                    </div>
                    <div>
                      <input
                        type="file"
                        multiple
                        ref={addFileInputRef}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={e => handleImageUpload(e, false)}
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => addFileInputRef.current?.click()}
                        className="btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-1"
                        style={{ background: '#0D1B2E', color: '#fff', fontSize: '0.78rem' }}
                      >
                        <Upload size={13} /> {addForm.images?.length > 0 ? '+ Add More Photos' : 'Choose Photos from Computer'}
                      </button>
                    </div>
                  </div>
                </div>

                {addForm.images && addForm.images.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 p-2 rounded-3" style={{ background: '#f1f5f9', maxHeight: '170px', overflowY: 'auto' }}>
                    {addForm.images.map((imgUrl, idx) => (
                      <div key={idx} className="position-relative rounded-2 overflow-hidden shadow-sm" style={{ width: '82px', height: '65px', border: idx === 0 ? '2px solid #16a34a' : '1px solid #cbd5e1' }}>
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <span className="position-absolute top-0 start-0 badge bg-success" style={{ fontSize: '0.52rem', padding: '2px 4px', borderRadius: '0 0 4px 0' }}>
                            Primary
                          </span>
                        )}
                        <div className="position-absolute top-0 end-0 d-flex gap-1 p-1">
                          {idx !== 0 && (
                            <button type="button" onClick={() => setPrimaryImage(idx, false)} className="btn btn-dark btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center" title="Set as primary cover photo" style={{ width: '18px', height: '18px', fontSize: '0.6rem', opacity: 0.85 }}>
                              <Star size={9} style={{ color: '#fbbf24' }} />
                            </button>
                          )}
                          <button type="button" onClick={() => removeImage(idx, false)} className="btn btn-danger btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center" title="Remove photo" style={{ width: '18px', height: '18px', fontSize: '0.6rem', opacity: 0.85 }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {uploadError && <div className="text-danger mt-1" style={{ fontSize: '0.72rem' }}>{uploadError}</div>}
              </div>
            </div>

            <div className="px-4 py-3 flex-shrink-0 border-top bg-white">
                <button type="submit" disabled={saving || uploadingImage} className="btn w-100 py-2.5 fw-bold text-white rounded-3 d-flex align-items-center justify-content-center gap-2" style={{ background: 'linear-gradient(90deg,#FF6333,#FF8A00)' }}>
                  <Plus size={14} />{saving ? 'Adding to Fleet...' : 'Add Vehicle to Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
