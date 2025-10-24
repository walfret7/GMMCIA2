// src/screens/BMIScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';         // <- (1) import
import firestore from '@react-native-firebase/firestore'; // <- (1) import
import { calcBMI, categorizeBMI, listenBMIHistory, saveBMIEntry } from '../services/userMetrics';

export default function BMIScreen() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]); // se llena en orden desc por fecha

  // Suscripción a historial
  useEffect(() => {
    let unsub;
    try {
      unsub = listenBMIHistory(
        (items) => {
          setHistory(items);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
          Alert.alert('IMC', 'No se pudo cargar el historial.');
        }
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('IMC', 'Inicia sesión para ver tu IMC.');
    }
    return () => unsub && unsub();
  }, []);

  // Recordatorio si pasó > 30 días desde la última medición
  useEffect(() => {
    if (history?.length > 0) {
      const last = history[0]?.notedAt?.toDate?.();
      if (last) {
        const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) {
          Alert.alert('IMC', 'Hace más de un mes que no actualizás tus datos. ¡Probá hacerlo ahora!');
        }
      }
    }
  }, [history]);

  // Cálculo en vivo
  const parsedWeight = parseFloat(weight.replace(',', '.'));
  const parsedHeight = parseFloat(height.replace(',', '.'));
  const liveBMI = useMemo(() => {
    if (!parsedWeight || !parsedHeight) return 0;
    return calcBMI(parsedWeight, parsedHeight);
  }, [parsedWeight, parsedHeight]);
  const liveCat = liveBMI ? categorizeBMI(liveBMI) : null;

  // Guardado
  const handleSave = async () => {
    const w = parsedWeight;
    const h = parsedHeight;

    if (!w || !h || w <= 0 || h <= 0 || h > 2.8 || w > 500) {
      Alert.alert('IMC', 'Verifica peso (kg) y altura (m). Ej.: peso 80, altura 1.75');
      return;
    }

    setSaving(true);
    try {
      await saveBMIEntry({ weightKg: w, heightM: h });
      setWeight('');
      setHeight('');
    } catch (e) {
      console.error(e);
      Alert.alert('IMC', e?.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // (2) Cargar 5 registros de demo (dev-only)
  const seedDemo = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('IMC', 'Inicia sesión para cargar datos de prueba.');
        return;
      }

      const ref = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('bmiMeasurements');

      // usa la altura ingresada si existe; si no, 1.75
      const h = parsedHeight && parsedHeight > 0 ? parsedHeight : 1.75;

      const entries = [
        { daysAgo: 60, weightKg: 88 },
        { daysAgo: 45, weightKg: 86 },
        { daysAgo: 30, weightKg: 85 },
        { daysAgo: 15, weightKg: 83 },
        { daysAgo: 5,  weightKg: 82 },
      ];

      const batch = firestore().batch();
      entries.forEach((e) => {
        const when = new Date();
        when.setDate(when.getDate() - e.daysAgo);

        const bmi = calcBMI(e.weightKg, h);
        const category = categorizeBMI(bmi);

        const docRef = ref.doc(); // autoId
        batch.set(docRef, {
          weightKg: e.weightKg,
          heightM: h,
          bmi,
          category,
          notedAt: firestore.Timestamp.fromDate(when),
        });
      });

      await batch.commit();
      Alert.alert('IMC', 'Datos de demo cargados (5 mediciones).');
    } catch (err) {
      console.error(err);
      Alert.alert('IMC', 'No se pudo cargar la demo.');
    }
  };

  // Render del historial
  const renderItem = ({ item }) => {
    const date = item.notedAt?.toDate?.() ?? null;
    const when = date ? date.toLocaleString() : '—';
    const labels = {
      bajo: 'Bajo peso',
      normal: 'Normal',
      sobrepeso: 'Sobrepeso',
      obesidad: 'Obesidad',
    };
    return (
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text style={{ fontWeight: '600' }}>{when}</Text>
        <Text>Peso: {item.weightKg} kg — Altura: {item.heightM} m</Text>
        <Text>IMC: {item.bmi} ({labels[item.category]})</Text>
      </View>
    );
  };

  // Promedio y tendencia
  const averageBMI = useMemo(() => {
    if (!history?.length) return 0;
    const sum = history.reduce((acc, h) => acc + (Number(h?.bmi) || 0), 0);
    return Number((sum / history.length).toFixed(1));
  }, [history]);

  const trendText = useMemo(() => {
    if (history?.length < 2) return null;
    const newest = Number(history[0]?.bmi || 0);
    const oldest = Number(history[history.length - 1]?.bmi || 0);
    if (!newest || !oldest) return null;
    return newest > oldest ? 'en aumento 📈' : newest < oldest ? 'en mejora 📉' : 'estable ➖';
  }, [history]);

  // Color y consejo por categoría (cálculo en vivo)
  const adviceBox = liveCat && (
    <View
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor:
          liveCat === 'bajo'
            ? '#BFDBFE'
            : liveCat === 'normal'
            ? '#BBF7D0'
            : liveCat === 'sobrepeso'
            ? '#FED7AA'
            : '#FCA5A5',
      }}>
      <Text style={{ fontWeight: '600' }}>
        {liveCat === 'bajo'
          ? 'Bajo peso: intenta mejorar tu alimentación y controla tu estado nutricional.'
          : liveCat === 'normal'
          ? 'Peso saludable: ¡seguí así!'
          : liveCat === 'sobrepeso'
          ? 'Sobrepeso: cuidá tu dieta y sumá actividad física regular.'
          : 'Obesidad: te recomendamos consulta con nutrición o endocrinología.'}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>IMC (Índice de Masa Corporal)</Text>

        {/* Formulario */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            elevation: 2,
          }}>
          <Text>Ingresa tus datos:</Text>

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text>Peso (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Ej.: 80"
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 12,
                  padding: 10,
                  marginTop: 4,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text>Altura (m)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="Ej.: 1.75"
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 12,
                  padding: 10,
                  marginTop: 4,
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text>
              IMC: {liveBMI || '—'}{' '}
              {liveCat &&
                `(${liveCat === 'bajo'
                  ? 'Bajo peso'
                  : liveCat === 'normal'
                  ? 'Normal'
                  : liveCat === 'sobrepeso'
                  ? 'Sobrepeso'
                  : 'Obesidad'})`}
            </Text>
          </View>

          {adviceBox}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#2563EB',
              padding: 14,
              borderRadius: 12,
              marginTop: 14,
              alignItems: 'center',
            }}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
            )}
          </TouchableOpacity>

          {/* (3) Botón dev para cargar demo */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={seedDemo}
              style={{
                backgroundColor: '#e2e8f0',
                padding: 12,
                borderRadius: 10,
                marginTop: 10,
                alignItems: 'center',
              }}>
              <Text style={{ fontWeight: '600', color: '#111827' }}>
                Cargar datos de demo (5)
              </Text>
            </TouchableOpacity>
          )}

          <Text style={{ marginTop: 8, color: '#555' }}>
            Fórmula: IMC = peso(kg) / altura(m)². Ej.: 80 / (1.75²) = 26.1
          </Text>
        </View>

        {/* Historial */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            marginTop: 16,
            elevation: 2,
            overflow: 'hidden',
          }}>
          <Text style={{ padding: 16, fontWeight: '700' }}>Historial</Text>

          {loading ? (
            <View style={{ padding: 24 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListEmptyComponent={
                <View style={{ padding: 24 }}>
                  <Text style={{ color: '#666' }}>Aún no hay mediciones.</Text>
                </View>
              }
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Promedio + Tendencia */}
        {history.length > 1 && (
          <View
            style={{
              padding: 12,
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              marginTop: 12,
            }}>
            <Text style={{ fontWeight: '600' }}>Promedio histórico</Text>
            <Text>
              {averageBMI} — tendencia: {trendText || '—'}
            </Text>
          </View>
        )}

        {/* Categorías de referencia */}
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginTop: 12 }}>
          <Text style={{ fontWeight: '600' }}>Categorías:</Text>
          <Text>{'<18.5: Bajo peso | 18.5–24.9: Normal | 25–29.9: Sobrepeso | ≥30: Obesidad'}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
