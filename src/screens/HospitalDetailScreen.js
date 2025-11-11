// src/screens/HospitalDetailScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';

// 🔹 Ajustá esta ruta según tu proyecto
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

/* Paleta inline */
const BG = '#F6F8FB';
const CARD = '#FFFFFF';
const TEXT = '#0F172A';
const SUBTEXT = '#475569';
const BORDER = '#E2E8F0';
const PRIMARY = '#2563EB';
const PRIMARY_SOFT = '#EFF6FF';
const SUCCESS = '#16A34A';
const SUCCESS_BG = '#DCFCE7';
const DANGER = '#B91C1C';
const DANGER_BG = '#FEE2E2';

const EMPTY_ARR = Object.freeze([]);

const normalize = (str = '') =>
  String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const asArr = (v) => (Array.isArray(v) ? v : v == null ? EMPTY_ARR : [v]);
const joinDays = (days) => {
  const list = asArr(days).map(String);
  return list.length ? list.join(' • ') : '';
};
const joinHours = (hours) => {
  const list = asArr(hours).map(String);
  return list.length ? list.join(', ') : '';
};

/** Agrupa openingHours por especialidad y doctor */
function groupOpening(openingHours = EMPTY_ARR) {
  const groups = {};
  for (const it of openingHours) {
    const spec = (it?.specialty || '').toString();
    if (!spec) continue;
    const doctor = (it?.doctor || '').toString();
    const key = `${spec}__${doctor || '__none'}`;
    if (!groups[key]) {
      groups[key] = {
        specialty: spec,
        doctor: doctor || null,
        mode: it?.mode || null,
        days: [],
        hours: [],
      };
    }
    groups[key].days.push(...asArr(it?.days));
    groups[key].hours.push(...asArr(it?.hours));
  }
  return Object.values(groups).map((g) => ({
    ...g,
    days: Array.from(new Set(g.days)),
    hours: Array.from(new Set(g.hours)),
  }));
}

export default function HospitalDetailScreen({ route }) {
  // Objeto liviano que llega desde el mapa/lista
  const initial = route?.params?.hospital || {};
  const recommendedSpecialty = route?.params?.recommendedSpecialty || null;
  const hiSlug = normalize(recommendedSpecialty || '');

  // Estado con el hospital "completo"
  const [full, setFull] = useState(initial);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Carga desde Firestore si falta openingHours u otros campos
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!initial?.id) {
        console.warn('HospitalDetail: falta hospital.id para cargar Firestore');
        return;
      }
      if (Array.isArray(initial.openingHours)) return; // ya vino completo

      try {
        setLoadingDoc(true);
        const snap = await getDoc(doc(db, 'hospitals', initial.id));
        if (!alive) return;
        if (snap.exists()) {
          setFull({ id: snap.id, ...snap.data() });
        } else {
          console.warn('HospitalDetail: doc no existe ->', initial.id);
        }
      } catch (e) {
        console.warn('HospitalDetail: getDoc error', e);
      } finally {
        if (alive) setLoadingDoc(false);
      }
    })();
    return () => { alive = false; };
  }, [initial?.id, initial?.openingHours]);

  // Datos seguros
  const name = full?.name || '(sin nombre)';
  const address = full?.address || '';
  const emergency24h = !!full?.emergency24h;
  const location = full?.location || null;

  const specialtiesDoc = Array.isArray(full?.specialties) ? full.specialties : EMPTY_ARR;
  const openingHoursSafe = Array.isArray(full?.openingHours) ? full.openingHours : EMPTY_ARR;

  const groups = useMemo(() => groupOpening(openingHoursSafe), [openingHoursSafe]);

  const allSpecialties = useMemo(() => {
    const fromHours = new Set(groups.map((g) => g.specialty));
    const set = new Set([...specialtiesDoc, ...fromHours]);
    return Array.from(set);
  }, [specialtiesDoc, groups]);

  // Orden: primero la especialidad recomendada
  const sortedItems = useMemo(() => {
    const base = groups.slice();
    base.sort((a, b) => {
      const aH = hiSlug && normalize(a.specialty) === hiSlug ? 0 : 1;
      const bH = hiSlug && normalize(b.specialty) === hiSlug ? 0 : 1;
      if (aH !== bH) return aH - bH;
      const s = a.specialty.localeCompare(b.specialty);
      if (s !== 0) return s;
      return (a.doctor || '').localeCompare(b.doctor || '');
    });
    return base;
  }, [groups, hiSlug]);

  const openMaps = () => {
    const lat = location?.lat, lng = location?.lng;
    const q = encodeURIComponent(`${name} ${address || ''}`);
    const url =
      typeof lat === 'number' && typeof lng === 'number'
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir Google Maps')
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      {/* 1) Datos del hospital */}
      <View style={styles.card}>
        <Text style={styles.title}>{name}</Text>
        {!!address && <Text style={styles.addr}>{address}</Text>}

        <View style={styles.badges}>
          {emergency24h ? (
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

      {/* 2) Especialidades del hospital */}
      <View style={styles.card}>
        <Text style={styles.section}>Especialidades del hospital</Text>
        {allSpecialties.length ? (
          <View style={styles.chipsWrap}>
            {allSpecialties.map((s) => (
              <View
                key={s}
                style={[
                  styles.chip,
                  hiSlug && normalize(s) === hiSlug && { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' },
                ]}
              >
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>(sin especialidades)</Text>
        )}
      </View>

      {/* 3) Doctores y horarios */}
      <View style={styles.card}>
        <Text style={styles.section}>
          Doctores y horarios {loadingDoc && <Text style={styles.muted}>(actualizando…)</Text>}
        </Text>

        {sortedItems.length === 0 ? (
          <Text style={styles.muted}>No hay horarios cargados.</Text>
        ) : (
          sortedItems.map((g, idx) => {
            const isHi = hiSlug && normalize(g.specialty) === hiSlug;
            return (
              <View
                key={`${g.specialty}-${g.doctor || 'no-doctor'}-${idx}`}
                style={[
                  styles.slotCard,
                  isHi && { borderColor: '#93C5FD', backgroundColor: PRIMARY_SOFT },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.slotTitle}>
                    {g.doctor ? g.doctor : `Atención de ${g.specialty}`}
                  </Text>
                  {g.mode ? (
                    <View style={styles.modeBadge}>
                      <Text style={{ color: PRIMARY, fontWeight: '700', fontSize: 12 }}>
                        {g.mode}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.rowKV, { marginTop: 6 }]}>
                  <Text style={styles.k}>Especialidad</Text>
                  <Text style={styles.v}>{g.specialty}</Text>
                </View>

                {!!joinDays(g.days) && (
                  <View style={styles.rowKV}>
                    <Text style={styles.k}>Días</Text>
                    <Text style={styles.v}>{joinDays(g.days)}</Text>
                  </View>
                )}
                {!!joinHours(g.hours) && (
                  <View style={styles.rowKV}>
                    <Text style={styles.k}>Horario</Text>
                    <Text style={styles.v}>{joinHours(g.hours)}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

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
  muted: { color: SUBTEXT },

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

  btn: {
    marginTop: 14,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

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

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Bloques de horarios / doctores
  slotCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FAFCFF',
  },
  slotTitle: { color: TEXT, fontWeight: '700' },

  rowKV: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  k: { color: SUBTEXT },
  v: { color: TEXT, fontWeight: '600' },

  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
});
