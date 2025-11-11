import React from 'react';
import { LogBox } from 'react-native';                 // ⬅️ 1) Importa LogBox
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthGate from './src/navigation/AuthGate';
import HospitalDetailScreen from './src/screens/HospitalDetailScreen';
import { FiltersProvider } from './src/state/FiltersContext';

const Stack = createNativeStackNavigator();

// ⬅️ 2) Ignora solo el warning de RN Firebase "namespaced API"
//     (podés cambiar a ignoreAllLogs(true) SOLO para una captura puntual)
LogBox.ignoreLogs([
  /React Native Firebase namespaced API/i,
  /This method is deprecated \(as well as all React Native Firebase namespaced API\)/i,
]);

export default function App() {
  return (
    <FiltersProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Auth" component={AuthGate} options={{ headerShown: false }} />
          <Stack.Screen name="Detalle" component={HospitalDetailScreen} options={{ title: 'Hospital' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </FiltersProvider>
  );
}
