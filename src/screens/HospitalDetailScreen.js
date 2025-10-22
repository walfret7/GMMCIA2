import React from 'react';
import { View, Text, Button, StyleSheet, Linking, Alert } from 'react-native';

function toCoord(location) {
  if (!location) return null;
  if (typeof location.lat === 'number' && typeof location.lng === 'number')
    return { latitude: location.lat, longitude: location.lng };
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number')
    return { latitude: location.latitude, longitude: location.longitude };
  if (typeof location._latitude === 'number' && typeof location._longitude === 'number')
    return { latitude: location._latitude, longitude: location._longitude };
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
  return null;
}

export default function HospitalDetailScreen({ route }) {
  const h = route.params?.hospital || {};
  const coord = toCoord(h.location);

  const openMaps = () => {
    if (coord) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coord.latitude},${coord.longitude}`;
      Linking.openURL(url).catch(() => Alert.alert('Ups', 'No se pudo abrir Google Maps'));
    } else if (h.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address)}`;
      Linking.openURL(url).catch(() => Alert.alert('Ups', 'No se pudo abrir Google Maps'));
    } else {
      Alert.alert('Sin ubicación', 'Este hospital no tiene coordenadas ni dirección.');
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{h.name}</Text>
      <Text style={styles.text}>{h.address || '(sin dirección)'}</Text>
      <Text style={styles.text}>
        {Array.isArray(h.specialties) ? h.specialties.join(' · ') : '(sin especialidades)'}
      </Text>
      {h.emergency24h ? <Text style={styles.badge}>Emergencia 24h</Text> : null}
      <View style={{ height: 12 }} />
      <Button title="Cómo llegar" onPress={openMaps} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  text: { marginTop: 6 },
  badge: { marginTop: 8, fontWeight: '700' },
});
