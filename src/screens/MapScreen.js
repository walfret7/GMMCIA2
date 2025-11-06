// src/screens/MapScreen.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';

import { getAllHospitals, applyFilters } from '../services/hospitals';
import { useFilters } from '../state/FiltersContext';
import Banner from '../components/Banner';
import theme from '../theme';

// ---- utilidades ----
function normalize(str = '') {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-_]+/g, '')
    .toLowerCase()
    .trim();
}

function toCoord(location) {
  if (!location) return null;
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { latitude: location.lat, longitude: location.lng };
  }
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return { latitude: location.latitude, longitude: location.longitude };
  }
  if (typeof location._latitude === 'number' && typeof location._longitude === 'number') {
    return { latitude: location._latitude, longitude: location._longitude };
  }
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
  return null;
}

function isValidLatLng({ latitude, longitude }) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function findNearestSafe(rows, userCoord) {
  const u = userCoord;
  if (!u || !isValidLatLng(u)) return null;
  let best = null;
  for (const h of rows) {
    const c = toCoord(h.location);
    if (!c || !isValidLatLng(c)) continue;
    const d = haversineKm(u, c);
    if (!best || d < best.distanceKm) best = { hospital: h, distanceKm: d, coord: c };
  }
  return best;
}

/** Estilo azulado (Google Maps JSON) + ocultar POIs/negocios */
const BLUE_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eaf2ff' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#eaf2ff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7d2fe' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);

  // Ubicación del usuario desde el propio MapView
  const [liveUserCoord, setLiveUserCoord] = useState(null); // { latitude, longitude }
  const [nearest, setNearest] = useState(null);              // { hospital, distanceKm, coord }

  const { mode, specialty, severity, hasActiveFilters, clearFilters } = useFilters();
  const normSpec = useMemo(() => normalize(specialty), [specialty]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getAllHospitals();
        if (mounted) setRows(data);
      } catch (e) {
        console.log('Error getAllHospitals:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const listToRender = useMemo(
    () => applyFilters(rows, { mode, specialty }),
    [rows, mode, specialty]
  );

  useEffect(() => { setNearest(null); }, [mode, specialty]);

  const mapKey = useMemo(() => {
    const ids = listToRender.map(h => h.id).join('|');
    return `${ids}::${mode}::${normSpec}`;
  }, [listToRender, mode, normSpec]);

  const doFitAll = useCallback(() => {
    const coords = listToRender.map(h => toCoord(h.location)).filter(Boolean);
    if (coords.length && mapRef.current) {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 110, right: 40, bottom: 130, left: 40 },
          animated: true,
        });
      } catch {}
    }
  }, [listToRender]);

  const handleMapReady = useCallback(() => {
    setTimeout(doFitAll, 250);
  }, [doFitAll]);

  useEffect(() => {
    if (!loading) setTimeout(doFitAll, 150);
  }, [loading, doFitAll]);

  // Tomamos la ubicación del evento del MapView (evita geolocation-service)
  const onUserLocationChange = useCallback((e) => {
    const c = e?.nativeEvent?.coordinate;
    if (!c) return;
    const u = { latitude: c.latitude, longitude: c.longitude };
    if (isValidLatLng(u)) setLiveUserCoord(u);
  }, []);

  // Resaltar más cercano (modo seguro: sin mover cámara automáticamente)
  const handleHighlightNearest = async () => {
    try {
      if (!listToRender.length) {
        Alert.alert('Sin resultados', 'No hay hospitales con los filtros actuales.');
        return;
      }
      if (!liveUserCoord) {
        Alert.alert('Ubicación', 'Esperá a que aparezca el punto azul de tu ubicación.');
        return;
      }
      setLocLoading(true);

      const best = findNearestSafe(listToRender, liveUserCoord);
      if (!best?.hospital || !best?.coord) {
        Alert.alert('Ups', 'No se pudo calcular el hospital más cercano.');
        return;
      }

      // Guardamos hospital + coord para Polyline y para centrar manualmente
      setNearest({ hospital: best.hospital, distanceKm: best.distanceKm, coord: best.coord });
      Alert.alert('Más cercano', `${best.hospital.name} • ${best.distanceKm.toFixed(1)} km`);
    } catch (e) {
      console.warn('Highlight error:', e);
      Alert.alert('Error', 'Ocurrió un error al resaltar el más cercano.');
    } finally {
      setLocLoading(false);
    }
  };

  // Botón opcional para centrar la cámara en el más cercano
  const handleCenter = () => {
    if (!nearest?.coord || !mapRef.current) return;
    mapRef.current.animateCamera({ center: nearest.coord, zoom: 16 }, { duration: 500 });
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  const bannerText =
    mode === 'emergency'
      ? 'Emergencia 24h'
      : mode === 'specialty' && specialty
        ? `Especialidad: ${specialty}`
        : 'Sin filtros';

  const isEmpty = listToRender.length === 0;

  const nearestText = nearest
    ? `Más cercano: ${nearest.hospital?.name ?? ''} • ${nearest.distanceKm?.toFixed?.(1) ?? '?'} km aprox.`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {hasActiveFilters && (
        <View
          style={{
            position: 'absolute',
            zIndex: 10,
            top: theme.spacing(1),
            left: theme.spacing(1),
            right: theme.spacing(1),
          }}>
          <Banner
            text={`Mostrando ${listToRender.length} de ${rows.length}`}
            severity={severity}
            onClear={() => { clearFilters(); setNearest(null); }}
          />
          <Text style={{ marginTop: 6, color: theme.colors.subtext }}>{bannerText}</Text>
          {!!nearestText && (
            <Text style={{ marginTop: 4, color: theme.colors.text, fontWeight: '700' }}>
              {nearestText}
            </Text>
          )}
        </View>
      )}

      {isEmpty && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            zIndex: 9,
            top: hasActiveFilters ? 110 : theme.spacing(3),
            left: theme.spacing(2),
            right: theme.spacing(2),
            alignItems: 'center',
          }}>
          <View style={{
            backgroundColor: '#FFFFFFE6',
            padding: theme.spacing(2),
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadow.card,
          }}>
            <Text style={{ fontWeight: '700', color: theme.colors.text, textAlign: 'center' }}>
              No hay hospitales para este filtro
            </Text>
            <Text style={{ marginTop: 4, color: theme.colors.subtext, textAlign: 'center' }}>
              Probá quitar o cambiar los filtros
            </Text>
          </View>
        </View>
      )}

      <MapView
        key={mapKey}
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        onMapReady={handleMapReady}
        customMapStyle={BLUE_STYLE}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsCompass={false}
        toolbarEnabled={false}
        showsUserLocation={true}
        onUserLocationChange={onUserLocationChange}
        initialRegion={{
          latitude: -25.5097,
          longitude: -54.6111,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {listToRender.map(h => {
          const c = toCoord(h.location);
          if (!c) return null;
          const highlight = nearest?.hospital?.id === h.id;
          return (
            <Marker
              key={h.id}
              coordinate={c}
              title={h.name}
              description={h.address}
              pinColor={highlight ? '#F97316' : undefined}
              onCalloutPress={() => navigation.navigate('Detalle', { hospital: h })}
            />
          );
        })}

        {/* Polyline usuario ↔ hospital más cercano */}
        {nearest?.coord && liveUserCoord && (
          <Polyline coordinates={[liveUserCoord, nearest.coord]} strokeWidth={4} />
        )}
      </MapView>

      {/* Botones */}
      <View style={styles.routeBar}>
        <TouchableOpacity
          onPress={handleHighlightNearest}
          style={styles.routeBtn}
          disabled={locLoading || isEmpty}
        >
          {locLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.routeBtnText}>{nearest ? 'Actualizar más cercano' : 'Resaltar más cercano'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCenter}
          style={[styles.routeBtn, { marginTop: 10, backgroundColor: '#0E7490' }]}
          disabled={!nearest?.coord}
        >
          <Text style={styles.routeBtnText}>Centrar vista</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  routeBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  routeBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
  },
  routeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
