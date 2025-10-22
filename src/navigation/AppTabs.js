import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HospitalScreen from '../screens/HospitalScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator();

export default function AppTabs(){
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Lista" component={HospitalScreen} />
      <Tab.Screen name="Mapa" component={MapScreen} />
    </Tab.Navigator>
  );
}
