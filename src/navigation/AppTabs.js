// src/navigation/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from 'react-native';
import auth from '@react-native-firebase/auth';

import ChatScreen from '../screens/ChatScreen';
import HospitalScreen from '../screens/HospitalScreen';
import MapScreen from '../screens/MapScreen';
import BMIScreen from '../screens/BMIScreen';

// Íconos
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Chat"
      screenOptions={({ route }) => ({
        headerShown: true,
        headerRight: () => (
          <Button
            title="Salir"
            onPress={() => auth().signOut().catch(() => {})}
            accessibilityLabel="Cerrar sesión"
          />
        ),
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: true,
        tabBarIcon: ({ color, size, focused }) => {
          let name = 'help-circle-outline';

          if (route.name === 'Chat') {
            name = focused ? 'chat-processing' : 'chat-outline';
          } else if (route.name === 'Lista') {
            name = focused ? 'hospital-box' : 'hospital';
          } else if (route.name === 'Mapa') {
            name = focused ? 'map-marker' : 'map-marker-outline';
          } else if (route.name === 'Salud') {
            // Cambiado: usar ícono seguro
            name = 'stethoscope';
          }

          return <MaterialCommunityIcons name={name} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Lista" component={HospitalScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Salud" component={BMIScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
