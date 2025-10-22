import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './src/navigation/AppTabs';
import HospitalDetailScreen from './src/screens/HospitalDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="HomeTabs" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Detalle" component={HospitalDetailScreen} options={{ title: 'Hospital' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
