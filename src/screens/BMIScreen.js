import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { calcBMI, categorizeBMI, listenBMIHistory, saveBMIEntry } from '../services/userMetrics';
import theme from '../theme';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';

export default function BMIScreen() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let unsub;
    try {
      unsub = listenBMIHistory(
        (items) => { setHistory(items); setLoading(false); },
        () => { setLoading(false); Alert.alert('IMC', 'No se pudo cargar el historial.'); }
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('IMC', 'Inicia sesión para ver tu IMC.');
    }
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (history?.length > 0) {
      const last = history[0]?.notedAt?.toDate?.();
      if (last) {
        const diffDays = (Date.now() - last.getTime()) / 86400000;
        if (diffDays > 30) Alert.alert('IMC', 'Hace más de un mes que no actualizás tus datos.');
      }
    }
  }, [history]);

  const parsedWeight = parseFloat(weight.replace(',', '.'));
  const parsedHeight = parseFloat(height.replace(',', '.'));
  const liveBMI = useMemo(() => (!parsedWeight || !parsedHeight) ? 0 : calcBMI(parsedWeight, parsedHeight), [parsedWeight, parsedHeight]);
  const liveCat = liveBMI ? categorizeBMI(liveBMI) : null;

  const handleSave = async () => {
    const w = parsedWeight, h = parsedHeight;
    if (!w || !h || w <= 0 || h <= 0 || h > 2.8 || w > 500) {
      Alert.alert('IMC', 'Verifica peso (kg) y altura (m). Ej.: 80, 1.75'); return;
    }
    setSaving(true);
    try { await saveBMIEntry({ weightKg: w, heightM: h }); setWeight(''); setHeight(''); }
    catch (e) { Alert.alert('IMC', e?.message || 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const seedDemo = async () => {
    try {
      const user = auth().currentUser; if (!user) return Alert.alert('IMC', 'Inicia sesión para cargar datos de prueba.');
      const ref = firestore().collection('users').doc(user.uid).collection('bmiMeasurements');
      const h = parsedHeight && parsedHeight > 0 ? parsedHeight : 1.75;
      const entries = [{d:60,w:88},{d:45,w:86},{d:30,w:85},{d:15,w:83},{d:5,w:82}];
      const batch = firestore().batch();
      entries.forEach(e=>{
        const when = new Date(); when.setDate(when.getDate()-e.d);
        const bmi = calcBMI(e.w, h); const category = categorizeBMI(bmi);
        batch.set(ref.doc(), { weightKg:e.w, heightM:h, bmi, category, notedAt: firestore.Timestamp.fromDate(when) });
      });
      await batch.commit(); Alert.alert('IMC', 'Datos de demo cargados (5).');
    } catch (err) { Alert.alert('IMC', 'No se pudo cargar la demo.'); }
  };

  const labels = { bajo:'Bajo peso', normal:'Normal', sobrepeso:'Sobrepeso', obesidad:'Obesidad' };
  const catBg = liveCat === 'bajo' ? '#E0F2FE' : liveCat === 'normal' ? '#DCFCE7' : liveCat === 'sobrepeso' ? '#FFEDD5' : '#FEE2E2';
  const catColor = liveCat === 'bajo' ? theme.colors.info : liveCat === 'normal' ? theme.colors.success : liveCat === 'sobrepeso' ? theme.colors.warning : theme.colors.danger;

  const averageBMI = useMemo(() => {
    if (!history?.length) return 0;
    const sum = history.reduce((acc, h) => acc + (Number(h?.bmi)||0), 0);
    return Number((sum / history.length).toFixed(1));
  }, [history]);

  const trendText = useMemo(() => {
    if (history?.length < 2) return null;
    const newest = Number(history[0]?.bmi||0), oldest = Number(history[history.length-1]?.bmi||0);
    if (!newest || !oldest) return null;
    return newest > oldest ? 'en aumento 📈' : newest < oldest ? 'en mejora 📉' : 'estable ➖';
  }, [history]);

  const renderItem = ({ item }) => {
    const date = item.notedAt?.toDate?.() ?? null;
    const when = date ? date.toLocaleString() : '—';
    return (
      <View style={{ paddingVertical: theme.spacing(1.25), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <Text style={{ fontWeight: '600', color: theme.colors.text }}>{when}</Text>
        <Text style={{ color: theme.colors.subtext }}>Peso: {item.weightKg} kg — Altura: {item.heightM} m</Text>
        <Text style={{ color: theme.colors.text }}>IMC: {item.bmi} ({labels[item.category]})</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing(2) }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.text }}>Salud • IMC</Text>

        <Card style={{ marginTop: theme.spacing(2) }}>
          <Text style={{ color: theme.colors.subtext, marginBottom: theme.spacing(1) }}>Ingresa tus datos</Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing(1) }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>Peso (kg)</Text>
              <TextInput
                value={weight} onChangeText={setWeight} placeholder="Ej.: 80" keyboardType="decimal-pad"
                style={{
                  borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
                  padding: 12, marginTop: 6, color: theme.colors.text
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: theme.colors.text }}>Altura (m)</Text>
              <TextInput
                value={height} onChangeText={setHeight} placeholder="Ej.: 1.75" keyboardType="decimal-pad"
                style={{
                  borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
                  padding: 12, marginTop: 6, color: theme.colors.text
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: theme.spacing(1.5), backgroundColor: catBg, borderRadius: theme.radius.md, padding: theme.spacing(1) }}>
            <Text style={{ fontWeight: '700', color: catColor }}>
              IMC: {liveBMI || '—'} {liveCat ? `(${labels[liveCat]})` : ''}
            </Text>
          </View>

          <Button title="Guardar en historial" onPress={handleSave} loading={saving} style={{ marginTop: theme.spacing(1.5) }} />
          {__DEV__ && <Button title="Cargar datos de demo (5)" variant="neutral" onPress={seedDemo} style={{ marginTop: theme.spacing(1) }} />}

          <Text style={{ marginTop: theme.spacing(1), color: theme.colors.muted }}>
            Fórmula: IMC = peso(kg) / altura(m)². Ej.: 80 / (1.75²) = 26.1
          </Text>
        </Card>

        <Card style={{ marginTop: theme.spacing(2) }} padding={false}>
          <View style={{ padding: theme.spacing(2), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ fontWeight: '700', color: theme.colors.text }}>Historial</Text>
          </View>
          <View style={{ paddingHorizontal: theme.spacing(2), paddingBottom: theme.spacing(1.5) }}>
            {loading ? (
              <View style={{ padding: theme.spacing(3) }}><Text>Cargando…</Text></View>
            ) : history.length === 0 ? (
              <EmptyState title="Aún no hay mediciones." subtitle="Guarda tu primera medición para ver el historial." />
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                scrollEnabled={false}
              />
            )}
          </View>
        </Card>

        {history.length > 1 && (
          <Card style={{ marginTop: theme.spacing(2) }}>
            <Text style={{ fontWeight: '700', color: theme.colors.text }}>Promedio histórico</Text>
            <Text style={{ marginTop: 4, color: theme.colors.text }}>
              {averageBMI} — tendencia: <Text style={{ fontWeight: '700' }}>{trendText || '—'}</Text>
            </Text>
          </Card>
        )}

        <Card style={{ marginTop: theme.spacing(2) }}>
          <Text style={{ fontWeight: '700', color: theme.colors.text }}>Categorías de referencia</Text>
          <Text style={{ marginTop: 4, color: theme.colors.subtext }}>
            {'<18.5: Bajo peso | 18.5–24.9: Normal | 25–29.9: Sobrepeso | ≥30: Obesidad'}
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
