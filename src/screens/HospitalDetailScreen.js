import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from 'react-native';

export default function HospitalDetailScreen({ route }) {
  const h = route.params?.hospital;
  if (!h) return <View style={styles.center}><Text>No se encontró el hospital.</Text></View>;

  const openMaps = () => {
    const lat = h?.location?.lat, lng = h?.location?.lng;
    const q = encodeURIComponent(`${h.name} ${h.address || ''}`);
    // si tenemos coords, mejor con coords
    const url = (typeof lat === 'number' && typeof lng === 'number')
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir Google Maps'));
  };

  const specialties = Array.isArray(h.specialties) ? h.specialties : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{h.name || '(sin nombre)'}</Text>
      {!!h.address && <Text style={styles.addr}>{h.address}</Text>}

      <View style={styles.badges}>
        {h.emergency24h ? <Text style={[styles.badge, styles.badgeOk]}>Emergencia 24h</Text>
                        : <Text style={[styles.badge, styles.badgeWarn]}>Sin emergencia 24h</Text>}
      </View>

      <Text style={styles.section}>Especialidades</Text>
      {specialties.length
        ? specialties.map((s, i) => (<Text key={i} style={styles.item}>• {s}</Text>))
        : <Text style={styles.muted}>(sin especialidades)</Text>}

      <Pressable style={styles.btn} onPress={openMaps}>
        <Text style={styles.btnText}>Cómo llegar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  container:{padding:16, gap:10},
  title:{fontSize:20,fontWeight:'700'},
  addr:{opacity:0.8},
  badges:{flexDirection:'row',gap:8,marginTop:6},
  badge:{paddingVertical:4,paddingHorizontal:8,borderRadius:8,overflow:'hidden',fontWeight:'600'},
  badgeOk:{backgroundColor:'#e8f8ef',color:'#0a7f43'},
  badgeWarn:{backgroundColor:'#fdecea',color:'#b71c1c'},
  section:{marginTop:14,fontSize:16,fontWeight:'700'},
  item:{fontSize:14},
  muted:{opacity:0.6},
  btn:{marginTop:18,backgroundColor:'#0a84ff',padding:12,borderRadius:10,alignItems:'center'},
  btnText:{color:'#fff',fontWeight:'700'}
});
