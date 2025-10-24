import React, { useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { getAllHospitals } from '../services/hospitals';

const Item = memo(function Item({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <Text style={styles.title}>{item.name || '(sin nombre)'}</Text>
      <Text style={styles.address}>{item.address || '(sin dirección)'}</Text>

      {item.emergency24h ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Emergencia 24h</Text>
        </View>
      ) : null}
    </TouchableOpacity>
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

  // Header propio (igual que Chat)
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Hospitales</Text>
      <TouchableOpacity onPress={() => auth().signOut()} style={styles.headerBtn}>
        <Text style={styles.headerBtnText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Cargando hospitales…</Text>
        </View>
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View style={styles.screen}>
        <Header />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No hay hospitales</Text>
          <Text style={styles.muted}>Intenta más tarde</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header />
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <Item item={item} onPress={() => navigation.navigate('Detalle', { hospital: item })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const BG = '#F6F8FB';
const PRIMARY = '#2563EB';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const SUBTEXT = '#475569';
const SUCCESS_BG = '#DCFCE7';
const SUCCESS = '#16A34A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: PRIMARY,
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
  headerBtnText: { color: PRIMARY, fontWeight: '700' },

  // List
  listContent: { padding: 12, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: TEXT },
  address: { color: SUBTEXT, marginTop: 4, fontSize: 14 },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: SUCCESS_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeText: { color: SUCCESS, fontWeight: '700' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  muted: { color: SUBTEXT, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
});
