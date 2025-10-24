import React from 'react';
import { View } from 'react-native';
import theme from '../../theme';

export default function Card({ children, style, padding=true }) {
  return (
    <View style={[{
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      borderColor: theme.colors.border,
      borderWidth: 1,
      ...theme.shadow.card,
      padding: padding ? theme.spacing(2) : 0,
    }, style]}>
      {children}
    </View>
  );
}
