import React from 'react';
import { View, Text } from 'react-native';
import theme from '../theme';

export default function EmptyState({ title='Sin resultados', subtitle='Intenta cambiar los filtros.' }) {
  return (
    <View style={{ padding: theme.spacing(3), alignItems: 'center' }}>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: theme.colors.subtext, marginTop: 4, textAlign: 'center' }}>{subtitle}</Text>
    </View>
  );
}
