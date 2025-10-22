import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { getAllHospitals } from '../services/hospitals';

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

  const handleMapReady = () => {
    const coords = rows.map(h => toCoord(h.location)).filter(Boolean);
    if (coords.length && mapRef.current) {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      } catch {}
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <MapView
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
        {rows.map(h => {
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
