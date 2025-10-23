// src/screens/MapScreen.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { getAllHospitals } from '../services/hospitals';
import { useFilters } from '../state/FiltersContext';

// Normaliza: sin tildes, sin espacios/guiones, minúsculas
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

export default function MapScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  // usamos mode + specialty (sin mezclar)
  const { mode, specialty, hasActiveFilters, clearFilters } = useFilters();
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

  // -------- FILTRADO según modo --------
  const listToRender = useMemo(() => {
    if (!hasActiveFilters) return rows;

    if (mode === 'emergency') {
      // solo hospitales con emergencia 24h
      return rows.filter(h => h.emergency24h === true);
    }

    if (mode === 'specialty' && normSpec) {
      return rows.filter(h => {
        const list = Array.isArray(h.specialties) ? h.specialties : [];
        const normList = list.map(s => normalize(s));
        return normList.some(ns => ns === normSpec || ns.includes(normSpec) || normSpec.includes(ns));
      });
    }

    return rows;
  }, [rows, hasActiveFilters, mode, normSpec]);

  // clave para forzar remount y evitar markers “fantasma”
  const mapKey = useMemo(() => {
    const ids = listToRender.map(h => h.id).join('|');
    return `${ids}::${mode}::${normSpec}`;
  }, [listToRender, mode, normSpec]);

  // encuadre del mapa (memoizado)
  const doFit = useCallback(() => {
    const coords = listToRender.map(h => toCoord(h.location)).filter(Boolean);
    if (coords.length && mapRef.current) {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      } catch {}
    }
  }, [listToRender]);

  const handleMapReady = useCallback(() => {
    setTimeout(doFit, 250);
  }, [doFit]);

  useEffect(() => {
    if (!loading) setTimeout(doFit, 150);
  }, [loading, doFit]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  const bannerText =
    mode === 'emergency'
      ? 'Emergencia 24h'
      : mode === 'specialty' && specialty
        ? `Esp. ${specialty}`
        : '—';

  return (
    <View style={{ flex: 1 }}>
      {hasActiveFilters && (
        <View style={{ position: 'absolute', zIndex: 10, top: 8, left: 8, right: 8 }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 10,
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <Text numberOfLines={1}>Filtros: {bannerText}</Text>
              <Pressable onPress={clearFilters}>
                <Text style={{ color: '#007aff', fontWeight: '600' }}>Quitar filtros</Text>
              </Pressable>
            </View>
            <Text style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
              Mostrando {listToRender.length} de {rows.length} hospitales
            </Text>
          </View>
        </View>
      )}

      <MapView
        key={mapKey}
        ref={mapRef}
        style={{ flex: 1 }}
        onMapReady={handleMapReady}
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
          return (
            <Marker
              key={h.id}
              coordinate={c}
              title={h.name}
              description={h.address}
              onCalloutPress={() => navigation.navigate('Detalle', { hospital: h })}
            />
          );
        })}
      </MapView>
    </View>
  );
}
