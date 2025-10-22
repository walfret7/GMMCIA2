import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getAllHospitals } from '../services/hospitals';

export default function MapScreen(){
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllHospitals();
        setRows(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex:1 }}>
      <MapView
        style={{ flex:1 }}
        initialRegion={{
          latitude: -25.5097, longitude: -54.6111,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
      >
        {rows.map(h => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h?.location?.lat || 0, longitude: h?.location?.lng || 0 }}
            title={h.name}
            description={h.address}
          />
        ))}
      </MapView>
    </View>
  );
}
