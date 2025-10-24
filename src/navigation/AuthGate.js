import React, { useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { ActivityIndicator, View } from 'react-native';
import HospitalDetailScreen from '../screens/HospitalDetailScreen';


const Stack = createNativeStackNavigator();

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged(u => {
      setUser(u);
      setBooting(false);
    });
    return unsub;
  }, []);

  if (booting) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {user ? (
        // Usuario autenticado → Tabs
        <Stack.Screen name="HomeTabs" component={AppTabs} options={{ headerShown: false }} />
      ) : (
        // No autenticado → flujo Auth
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} />
          <Stack.Screen name="Detalle" component={HospitalDetailScreen} options={{ title: 'Detalle' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
