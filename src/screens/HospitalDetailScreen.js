// src/screens/HospitalDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';

export default function HospitalDetailScreen({ route }) {
  const h = route.params?.hospital;
  if (!h) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No se encontró el hospital.</Text>
      </View>
    );
  }

  const openMaps = () => {
    const lat = h?.location?.lat, lng = h?.location?.lng;
    const q = encodeURIComponent(`${h.name} ${h.address || ''}`);
    const url =
      typeof lat === 'number' && typeof lng === 'number'
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir Google Maps')
    );
  };

  const specialties = Array.isArray(h.specialties) ? h.specialties : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      {/* Card principal */}
      <View style={styles.card}>
        <Text style={styles.title}>{h.name || '(sin nombre)'}</Text>
        {!!h.address && <Text style={styles.addr}>{h.address}</Text>}

        <View style={styles.badges}>
          {h.emergency24h ? (
            <View style={[styles.badge, styles.badgeOk]}>
              <Text style={[styles.badgeText, { color: SUCCESS }]}>Emergencia 24h</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeWarn]}>
              <Text style={[styles.badgeText, { color: DANGER }]}>Sin emergencia 24h</Text>
            </View>
          )}
        </View>

        <Pressable style={styles.btn} onPress={openMaps}>
          <Text style={styles.btnText}>Cómo llegar</Text>
        </Pressable>
      </View>

      {/* Especialidades */}
      <View style={styles.card}>
        <Text style={styles.section}>Especialidades</Text>
        {specialties.length ? (
          <View style={styles.chipsWrap}>
            {specialties.map((s, i) => (
              <View key={`${s}-${i}`} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>(sin especialidades)</Text>
        )}
      </View>
    </ScrollView>
  );
}

/* Paleta inline para mantener consistencia con otras pantallas */
const BG = '#F6F8FB';
const CARD = '#FFFFFF';
const TEXT = '#0F172A';
const SUBTEXT = '#475569';
const BORDER = '#E2E8F0';
const PRIMARY = '#2563EB';
const SUCCESS = '#16A34A';
const SUCCESS_BG = '#DCFCE7';
const DANGER = '#B91C1C';
const DANGER_BG = '#FEE2E2';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: SUBTEXT },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 12,
  },

  title: { fontSize: 20, fontWeight: '700', color: TEXT },
  addr: { marginTop: 4, color: SUBTEXT, fontSize: 14 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeOk: { backgroundColor: SUCCESS_BG, borderColor: '#BBF7D0' },
  badgeWarn: { backgroundColor: DANGER_BG, borderColor: '#FECACA' },
  badgeText: { fontWeight: '700' },

  section: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 10 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FAFAFA',
  },
  chipText: { color: TEXT, fontSize: 13 },

  btn: {
    marginTop: 14,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
