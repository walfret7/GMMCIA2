// src/services/hospitals.js
import firestore from '@react-native-firebase/firestore';

// ---------- helpers internos ----------
const toNumber = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function parseLocation(raw) {
  if (!raw) return null;

  // objeto ya numérico
  if (typeof raw.lat === 'number' && typeof raw.lng === 'number') {
    return { lat: raw.lat, lng: raw.lng };
  }
  if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
    return { lat: raw.latitude, lng: raw.longitude };
  }
  if (typeof raw._latitude === 'number' && typeof raw._longitude === 'number') {
    return { lat: raw._latitude, lng: raw._longitude };
  }

  // string: extrae dos números
  const s = String(raw);
  const cleaned = s.replace(/[NSEW\[\]\(\)]/gi, ' ').replace(/°/g, ' ');
  const nums = cleaned.match(/-?\d+[\.,]?\d*/g);
  if (nums && nums.length >= 2) {
    let lat = toNumber(nums[0]);
    let lng = toNumber(nums[1]);
    if (/S/i.test(s) && lat) lat = -Math.abs(lat);
    if (/W/i.test(s) && lng) lng = -Math.abs(lng);
    if (lat != null && lng != null) return { lat, lng };
  }
  return null;
}

// specialties: array de strings
function parseSpecialties(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw)
    .split(/[,·|;/-]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

// normalizador para armar slugs simples
const norm = (s = '') =>
  String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-_]+/g, '')
    .toLowerCase()
    .trim();

function normalizeDoc(id, data) {
  const location = parseLocation(data.location);
  const specialties = parseSpecialties(data.specialties);
  return {
    id,
    name: data.name ?? '',
    address: data.address ?? '',
    location,
    specialties,
    specialties_slugs: specialties.map(norm),
    emergency24h: Boolean(
      data.emergency24h ?? data.emergency ?? data.hasEmergency ?? false
    ),
    // por compatibilidad si en algún lado querés acceder directo:
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
  };
}

// ---------- API pública ----------
export async function getAllHospitals() {
  const snap = await firestore().collection('hospitals').get();
  return snap.docs.map(d => normalizeDoc(d.id, d.data() || {}));
}

/** Aplica filtros globales a la lista */
export function applyFilters(hospitals = [], filters = {}) {
  const { mode, specialty } = filters;
  if (!hospitals.length) return [];

  if (mode === 'emergency') {
    return hospitals.filter(h => h.emergency24h === true);
  }

  if (mode === 'specialty' && specialty) {
    const slug = norm(specialty);
    return hospitals.filter(h => (h.specialties_slugs || []).some(s => s === slug || slug.includes(s) || s.includes(slug)));
  }

  return hospitals;
}

/** Haversine en km */
function haversineKm(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Devuelve { hospital, distanceKm } más cercano al punto dado */
export function findNearest(hospitals = [], origin) {
  if (!hospitals.length || !origin) return null;
  let best = null;
  for (const h of hospitals) {
    if (typeof h.lat !== 'number' || typeof h.lng !== 'number') continue;
    const d = haversineKm(origin, { lat: h.lat, lng: h.lng });
    if (!best || d < best.distanceKm) best = { hospital: h, distanceKm: d };
  }
  return best;
}
