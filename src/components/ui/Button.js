import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import theme from '../../theme';

export default function Button({ title, onPress, loading, variant='primary', style, textStyle }) {
  const bg = {
    primary: theme.colors.primary,
    neutral: '#E2E8F0',
    danger: theme.colors.danger,
  }[variant] || theme.colors.primary;

  const color = variant === 'neutral' ? theme.colors.text : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[{
        backgroundColor: bg,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        alignItems: 'center',
      }, style]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'neutral' ? theme.colors.text : '#fff'} />
        : <Text style={[{ color, fontWeight: '700' }, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}
