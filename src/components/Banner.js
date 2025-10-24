import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import theme from '../theme';

export default function Banner({ text, severity, onClear }) {
  return (
    <View style={{
      backgroundColor: '#FFFFFFCC',
      borderRadius: theme.radius.lg,
      padding: theme.spacing(1.5),
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    }}>
      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{text}</Text>
      {severity ? (
        <Text style={{ color: theme.colors.subtext, marginTop: 2 }}>Severidad sugerida: {severity}</Text>
      ) : null}
      {!!onClear && (
        <TouchableOpacity onPress={onClear} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Quitar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
