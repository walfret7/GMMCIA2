// src/navigation/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button /*, Pressable, Text */ } from 'react-native';
import auth from '@react-native-firebase/auth';

import ChatScreen from '../screens/ChatScreen';
import HospitalScreen from '../screens/HospitalScreen';
import MapScreen from '../screens/MapScreen';
import BMIScreen from '../screens/BMIScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Chat"                 // <- arranca siempre en Chat
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <Button
            title="Salir"
            onPress={() => auth().signOut().catch(() => {})}  // <- maneja error
            accessibilityLabel="Cerrar sesión"
          />
        ),
      }}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Lista" component={HospitalScreen} />
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen
        name="Salud"
        component={BMIScreen}
        options={{ tabBarLabel: 'Salud' }}
      />
    </Tab.Navigator>
  );
}
