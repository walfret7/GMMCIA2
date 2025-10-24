// src/screens/MapScreen.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { getAllHospitals } from '../services/hospitals';
import { useFilters } from '../state/FiltersContext';
import Banner from '../components/Banner';
import theme from '../theme';

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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

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

  // -------- FILTRADO según modo --------
  const listToRender = useMemo(() => {
    if (!hasActiveFilters) return rows;

    if (mode === 'emergency') {
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

  // encuadre del mapa
  const doFit = useCallback(() => {
    const coords = listToRender.map(h => toCoord(h.location)).filter(Boolean);
    if (coords.length && mapRef.current) {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 110, right: 40, bottom: 80, left: 40 }, // más espacio por banner
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
        ? `Especialidad: ${specialty}`
        : 'Sin filtros';

  const isEmpty = listToRender.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Banner superior cuando hay filtros activos */}
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
            onClear={clearFilters}
          />
          <Text style={{ marginTop: 6, color: theme.colors.subtext }}>{bannerText}</Text>
        </View>
      )}

      {/* Estado vacío bonito */}
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
        onMapReady={handleMapReady}
        customMapStyle={BLUE_STYLE}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsCompass={false}
        toolbarEnabled={false}
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
              // Si más adelante quieres ícono propio: agrega 'image={require(".../pin.png")}'
              onCalloutPress={() => navigation.navigate('Detalle', { hospital: h })}
            />
          );
        })}
      </MapView>
    </View>
  );
}
