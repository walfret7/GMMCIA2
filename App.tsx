import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppTabs from './src/navigation/AppTabs';

export default function App(){
  return (
    <NavigationContainer>
      <AppTabs />
    </NavigationContainer>
  );
}
