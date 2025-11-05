// src/screens/ChatScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { useFilters } from '../state/FiltersContext';
import { predictSymptoms } from '../services/predict'; // ⬅️ IA local (TF-IDF + LR)

const THRESHOLD = 0.50; // umbral de confianza para aceptar IA

/* Util: normaliza texto (sin tildes, minúsculas) */
const norm = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Clasificador por reglas (fallback). NO mezcla emergencia con especialidad.
 * Devuelve: { mode: 'none'|'emergency'|'specialty', specialty?: string|null, severity: 1..5 }
 */
function classifySymptomsRules(text) {
  const t = norm(text || '');

  // 1) Emergencia (si hay, gana siempre)
  const emergencyTerms = [
    'no puede respirar','no puedo respirar','no puede hablar','ahogo','asfix','labios morados',
    'inconscient','convulsion','convulsi','desmayo','no reacciona','paralisis',
    'dolor de pecho intenso','opresion toracica','opresion en el pecho','dolor toracico fuerte',
    'sangrado abundante','hemorrag','fractura expuesta','quemadura grave',
    'acv','ictus','derrame'
  ];
  const isEmergency = emergencyTerms.some(k => t.includes(k));

  // 2) Especialidades (aplica SOLO si NO es emergencia)
  const specMap = [
    { spec: 'cardiología', keys: [
      'dolor de pecho','opresion en el pecho','opresion torac',
      'palpit','taquicard','hipertens','presion alta','arritm'
    ]},
    { spec: 'neumología', keys: [
      'tos persistente','tos con flema','flema','expectoracion','expectoración',
      'falta de aire','disnea','silbidos','sibilancia','asma','bronquitis','neumon','neumonía','dificultad para respirar'
    ]},
    { spec: 'neurología', keys: [
      'migraña','dolor de cabeza fuerte','cefalea intensa','vision doble','visión doble',
      'debilidad de un lado','hormigueo brazo','hormigueo pierna','mareo intenso'
    ]},
    { spec: 'traumatología', keys: [
      'fractura','esguince','golpe fuerte','trauma','dolor de rodilla','dolor de espalda','dolor de hombro'
    ]},
    { spec: 'pediatría', keys: [
      'nino','niño','bebe','bebé','fiebre nino','otitis nino','vomito nino','diarrea nino'
    ]},
    { spec: 'ginecología', keys: [
      'embarazo','atraso menstrual','sangrado vaginal','dolor pelvico','gineco','menstruacion'
    ]},
    { spec: 'dermatología', keys: [
      'erupcion','salpullido','mancha piel','picazon piel','dermat'
    ]},
    { spec: 'otorrinolaringología', keys: [
      'dolor de oido','dolor de oído','oido tapado','sinusitis','dolor de garganta','amigdal'
    ]},
    { spec: 'urología', keys: [
      'dolor al orinar','ardor al orinar','sangre en orina','colico renal','piedras','prostata'
    ]},
    { spec: 'endocrinología', keys: [
      'diabetes','glucosa alta','tiroid','hipotiroid','hipertiroid'
    ]},
    { spec: 'clínica médica', keys: [
      'fiebre','malestar general','resfriado','catarro','dolor abdominal','diarrea',
      'vomito','náusea','nausea','tos','dolor muscular'
    ]},
  ];

  // 3) Severidad (heurística simple)
  let severity = 2; // leve por defecto
  if (/\b(fuerte|intenso|incapacitante|terrible|desesperante|opresion|opresión)\b/.test(t)) severity = 4;
  if (/\b(no puede respirar|no puedo respirar|inconscient|hemorrag|fractura expuesta)\b/.test(t)) severity = 5;

  // 4) Resolver modo (no mezclar)
  if (isEmergency) return { mode: 'emergency', specialty: null, severity: Math.max(severity, 4) };

  const cardioHit = specMap[0].keys.some(k => t.includes(k));
  if (cardioHit) return { mode: 'specialty', specialty: 'cardiología', severity };

  for (const row of specMap) {
    if (row.spec === 'cardiología') continue;
    if (row.keys.some(k => t.includes(k))) {
      return { mode: 'specialty', specialty: row.spec, severity };
    }
  }
  return { mode: 'specialty', specialty: 'clínica médica', severity };
}

/** Mapea etiqueta del modelo → {mode, specialty} del flujo */
function mapModelLabelToFilters(label) {
  if (label === 'emergencias') return { mode: 'emergency', specialty: null };
  return { mode: 'specialty', specialty: label || 'clínica médica' };
}

// Chip simple
function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const nav = useNavigation();
  const { setFilters } = useFilters();
  const [text, setText] = useState('');
  const [profile, setProfile] = useState('adult'); // 'adult' | 'child' | 'pregnant'

  const onAnalyze = async () => {
    const t = text.trim();
    if (!t) {
      Alert.alert('Escribe tus síntomas', 'Ej: dolor de pecho y falta de aire');
      return;
    }

    try {
      // 1) IA local
      const ia = await predictSymptoms(t); // {label, confidence, probs}
      const useIA = ia && typeof ia.confidence === 'number' && ia.confidence >= THRESHOLD;

      let mode, specialty, severity;
      if (useIA) {
        const mapped = mapModelLabelToFilters(ia.label);
        mode = mapped.mode;
        specialty = mapped.specialty || '';
        severity = classifySymptomsRules(t).severity;
      } else {
        // 2) Fallback a reglas
        const r = classifySymptomsRules(t);
        mode = r.mode;
        specialty = r.specialty || '';
        severity = r.severity;
      }

      // Guardar filtros + perfil y navegar
      setFilters({ mode, specialty, severity, patientProfile: profile });

      const msg =
        mode === 'emergency'
          ? `EMERGENCIA (sev. ${severity}) • ${useIA ? 'IA' : 'Reglas'} ${useIA ? `(${(ia.confidence*100).toFixed(0)}%)` : ''}`
          : `Esp.: ${specialty} (sev. ${severity}) • ${useIA ? 'IA' : 'Reglas'} ${useIA ? `(${(ia.confidence*100).toFixed(0)}%)` : ''}`;

      Alert.alert('Análisis', msg);
      nav.navigate('Mapa');
    } catch (err) {
      console.error('Error en análisis:', err);
      const { mode, specialty, severity } = classifySymptomsRules(t);
      setFilters({ mode, specialty: specialty || '', severity, patientProfile: profile });
      Alert.alert('Análisis', 'Ocurrió un problema con la IA. Se usó el clasificador por reglas.');
      nav.navigate('Mapa');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F6F8FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Médico</Text>
        <TouchableOpacity onPress={() => auth().signOut()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Describe tus síntomas</Text>

          <TextInput
            multiline
            placeholder="Ej: dolor de pecho y falta de aire desde ayer"
            value={text}
            onChangeText={setText}
            style={styles.input}
          />

          {/* 🔵 Chips de perfil del paciente */}
          <View style={styles.chipsRow}>
            <Chip label="Adulto"   active={profile === 'adult'}    onPress={() => setProfile('adult')} />
            <Chip label="Niño"     active={profile === 'child'}    onPress={() => setProfile('child')} />
            <Chip label="Embarazo" active={profile === 'pregnant'} onPress={() => setProfile('pregnant')} />
          </View>

          <TouchableOpacity onPress={onAnalyze} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Analizar y ver hospitales</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            El resultado aplicará filtros en el mapa (podés quitarlos desde el banner).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerBtn: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerBtnText: { color: '#2563EB', fontWeight: '700' },

  container: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0F172A',
  },

  // 🔵 estilos de chips
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    color: '#1E40AF',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },

  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: '#475569', marginTop: 12, textAlign: 'center', fontSize: 13 },
});
