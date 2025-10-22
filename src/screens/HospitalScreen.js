import React, { useEffect, useState, memo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllHospitals } from '../services/hospitals';

const Item = memo(function Item({ item, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.card}>
        <Text style={styles.title}>{item.name || '(sin nombre)'}</Text>
        <Text style={styles.text}>{item.address || '(sin dirección)'}</Text>
        <Text style={styles.text}>
          {Array.isArray(item.specialties) ? item.specialties.join(' · ') : '(sin especialidades)'}
        </Text>
        {item.emergency24h ? <Text style={styles.badge}>Emergencia 24h</Text> : null}
      </View>
    </Pressable>
  );
});

export default function HospitalScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllHospitals();
        setRows(data);
      } catch (e) {
        console.error('Error cargando hospitales:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Cargando hospitales…</Text>
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No hay hospitales en la colección.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => (
        <Item item={item} onPress={() => navigation.navigate('Detalle', { hospital: item })} />
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { opacity: 0.7, marginTop: 8 },
  listContent: { padding: 12 },
  sep: { height: 8 },

  // estilos de la tarjeta
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: '#fff' },
  text: { opacity: 0.9, color: '#fff' },
  badge: { marginTop: 6, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: '#111316', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2f36' },
});
