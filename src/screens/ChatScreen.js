import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFilters } from '../state/FiltersContext';

/* Util: normaliza texto (sin tildes, minúsculas) */
const norm = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Clasificador "reglas+" — NO mezcla emergencia con especialidad.
 * Devuelve: { mode: 'none'|'emergency'|'specialty', specialty?: string|null, severity: 1..5 }
 */
function classifySymptoms(text) {
  const t = norm(text || '');

  // 1) Emergencia (si hay, gana siempre)
  const emergencyTerms = [
    // respiratorio severo
    'no puede respirar', 'no puedo respirar', 'no puede hablar', 'ahogo', 'asfix', 'labios morados',
    // neurológico
    'inconscient', 'convulsion', 'convulsi', 'desmayo', 'no reacciona', 'paralisis',
    // cardiaco severo
    'dolor de pecho intenso', 'opresion toracica', 'opresion en el pecho', 'dolor toracico fuerte',
    // sangrado/trauma
    'sangrado abundante', 'hemorrag', 'fractura expuesta', 'quemadura grave',
    // evento vascular
    'acv', 'ictus', 'derrame'
  ];
  const isEmergency = emergencyTerms.some(k => t.includes(k));

  // 2) Especialidades (aplica SOLO si NO es emergencia)
  const specMap = [
    { spec: 'cardiología', keys: [
      'dolor de pecho', 'opresion en el pecho', 'opresion torac',
      'palpit', 'taquicard', 'hipertens', 'presion alta', 'arritm'
    ]},
    { spec: 'neumología', keys: [
      'tos persistente', 'tos con flema', 'flema', 'expectoracion', 'expectoración',
      'falta de aire', 'disnea', 'silbidos', 'sibilancia', 'asma',
      'bronquitis', 'neumon', 'neumonía', 'dificultad para respirar'
    ]},
    { spec: 'neurología', keys: [
      'migraña', 'dolor de cabeza fuerte', 'cefalea intensa',
      'vision doble', 'visión doble', 'debilidad de un lado',
      'hormigueo brazo', 'hormigueo pierna', 'mareo intenso'
    ]},
    { spec: 'traumatología', keys: [
      'fractura', 'esguince', 'golpe fuerte', 'trauma', 'dolor de rodilla', 'dolor de espalda', 'dolor de hombro'
    ]},
    { spec: 'pediatría', keys: [
      'nino', 'niño', 'bebe', 'bebé', 'fiebre nino', 'otitis nino', 'vomito nino', 'diarrea nino'
    ]},
    { spec: 'ginecología', keys: [
      'embarazo', 'atraso menstrual', 'sangrado vaginal', 'dolor pelvico', 'gineco', 'menstruacion'
    ]},
    { spec: 'dermatología', keys: [
      'erupcion', 'salpullido', 'mancha piel', 'picazon piel', 'dermat'
    ]},
    { spec: 'otorrinolaringología', keys: [
      'dolor de oido', 'dolor de oído', 'oido tapado', 'sinusitis', 'dolor de garganta', 'amigdal'
    ]},
    { spec: 'urología', keys: [
      'dolor al orinar', 'ardor al orinar', 'sangre en orina', 'colico renal', 'piedras', 'prostata'
    ]},
    { spec: 'endocrinología', keys: [
      'diabetes', 'glucosa alta', 'tiroid', 'hipotiroid', 'hipertiroid'
    ]},
    { spec: 'clínica médica', keys: [
      'fiebre', 'malestar general', 'resfriado', 'catarro',
      'dolor abdominal', 'diarrea', 'vomito', 'náusea', 'nausea',
      'tos', 'dolor muscular'
    ]},
  ];

  // 3) Severidad (heurística simple)
  let severity = 2; // leve por defecto
  if (/\b(fuerte|intenso|incapacitante|terrible|desesperante|opresion|opresión)\b/.test(t)) severity = 4;
  if (/\b(no puede respirar|no puedo respirar|inconscient|hemorrag|fractura expuesta)\b/.test(t)) severity = 5;

  // 4) Resolver modo (no mezclar)
  if (isEmergency) return { mode: 'emergency', specialty: null, severity: Math.max(severity, 4) };

  // cardiología prioritaria si hay "dolor de pecho"
  const cardioHit = specMap[0].keys.some(k => t.includes(k));
  if (cardioHit) return { mode: 'specialty', specialty: 'cardiología', severity };

  // resto de especialidades
  for (const row of specMap) {
    if (row.spec === 'cardiología') continue;
    if (row.keys.some(k => t.includes(k))) {
      return { mode: 'specialty', specialty: row.spec, severity };
    }
  }

  // fallback (mejor que 'none' para el flujo)
  return { mode: 'specialty', specialty: 'clínica médica', severity };
}

export default function ChatScreen() {
  const nav = useNavigation();
  const { setFilters } = useFilters();
  const [text, setText] = useState('');

  const onAnalyze = () => {
    const t = text.trim();
    if (!t) {
      Alert.alert('Escribe tus síntomas', 'Ej: dolor de pecho y falta de aire');
      return;
    }

    const { mode, specialty, severity } = classifySymptoms(t);

    // setea filtros globales (MapScreen ya los usa)
    setFilters({ mode, specialty: specialty || '', severity });

    const msg =
      mode === 'emergency'
        ? `EMERGENCIA (sev. ${severity})`
        : mode === 'specialty'
        ? `Esp.: ${specialty} (sev. ${severity})`
        : 'No se detectó una especialidad';

    Alert.alert('Análisis', msg);
    nav.navigate('Mapa');
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Describe tus síntomas</Text>
      <TextInput
        multiline
        placeholder="Ej: dolor de pecho y falta de aire desde ayer"
        value={text}
        onChangeText={setText}
        style={styles.input}
      />
      <Button title="Analizar y ver hospitales" onPress={onAnalyze} />
      <Text style={styles.hint}>
        El resultado aplicará filtros en el Mapa (podés quitarlos desde el banner).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  hint: { opacity: 0.7, marginTop: 8 },
});
