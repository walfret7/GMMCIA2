import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HospitalScreen from '../screens/HospitalScreen';
import MapScreen from '../screens/MapScreen';
import { Button } from 'react-native';
import auth from '@react-native-firebase/auth';

const Tab = createBottomTabNavigator();

export default function AppTabs(){
  return (
    <Tab.Navigator screenOptions={{
      headerShown: true,
      headerRight: () => (
        <Button title="Salir" onPress={() => auth().signOut()} />
      )
    }}>
      <Tab.Screen name="Lista" component={HospitalScreen} />
      <Tab.Screen name="Mapa" component={MapScreen} />
    </Tab.Navigator>
  );
}
