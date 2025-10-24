const colors = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#475569',
  primary: '#2563EB',
  border: '#E5E7EB',
  success: '#16A34A',
  warning: '#F59E0B',
  danger:  '#EF4444',
  info:    '#0891B2',
  muted:   '#94A3B8',
};
const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
const shadow = { // Android+ iOS básico
  card: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 }
};
const spacing = (n=1) => 8*n;

export default { colors, radius, shadow, spacing };
