// src/utils/geo.js
import {Linking, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

/** Distancia Haversine en km entre dos {lat, lng} */
export function haversineKm(a, b) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Pide ubicación (fine) con promesa */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      err => reject(err),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 5000, ...options}
    );
  });
}

/** Abre Google Maps con ruta conducción */
export function openRouteInMaps(origin, dest) {
  // origin/dest: {lat, lng}
  const o = `${origin.lat},${origin.lng}`;
  const d = `${dest.lat},${dest.lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
  Linking.openURL(url);
}
