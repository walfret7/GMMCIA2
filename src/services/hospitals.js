// src/services/hospitals.js
import firestore from '@react-native-firebase/firestore';

// helpers de parsing -------------------------------
const toNumber = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// "25.53..., -54.63..." | "[25.53 S, 54.63 W]" | { lat, lng } | {_latitude,_longitude}
function parseLocation(raw) {
  if (!raw) return null;

  // objeto ya numerico
  if (typeof raw.lat === 'number' && typeof raw.lng === 'number') {
    return { lat: raw.lat, lng: raw.lng };
  }
  if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
    return { lat: raw.latitude, lng: raw.longitude };
  }
  if (typeof raw._latitude === 'number' && typeof raw._longitude === 'number') {
    return { lat: raw._latitude, lng: raw._longitude };
  }

  // string: intentamos extraer los dos números
  const s = String(raw);
  // quita letras N,S,E,W y corchetes
  const cleaned = s.replace(/[NSEW\[\]\(\)]/gi, ' ').replace(/°/g, ' ');
  const nums = cleaned.match(/-?\d+[\.,]?\d*/g);
  if (nums && nums.length >= 2) {
    // si venía en "lat S, lng W" invertimos el signo cuando hay S/W
    let lat = toNumber(nums[0]);
    let lng = toNumber(nums[1]);
    if (/S/i.test(s) && lat) lat = -Math.abs(lat);
    if (/W/i.test(s) && lng) lng = -Math.abs(lng);
    if (lat != null && lng != null) return { lat, lng };
  }
  return null;
}

// convierte specialties a array de strings
function parseSpecialties(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(String);
  }
  // si viene como string con separadores (coma, punto medio, guión)
  return String(raw)
    .split(/[,·|;/-]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeDoc(id, data) {
  return {
    id,
    name: data.name ?? '',
    address: data.address ?? '',
    location: parseLocation(data.location),
    specialties: parseSpecialties(data.specialties),
    // soporta "emergency24h" o "emergency" o "hasEmergency"
    emergency24h: Boolean(
      data.emergency24h ?? data.emergency ?? data.hasEmergency ?? false
    ),
  };
}

export async function getAllHospitals() {
  const snap = await firestore().collection('hospitals').get();
  const rows = snap.docs.map(d => normalizeDoc(d.id, d.data() || {}));
  return rows;
}
