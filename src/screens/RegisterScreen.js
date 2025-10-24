// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!email.trim() || !pass || !pass2) {
      Alert.alert('Faltan datos', 'Completá email y contraseñas.');
      return;
    }
    if (pass !== pass2) {
      Alert.alert('Contraseña', 'Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email.trim(), pass);
      Alert.alert('Registro', '¡Cuenta creada! Ya podés iniciar sesión.');
      nav.goBack();
    } catch (e) {
      Alert.alert('Registro', e?.message || 'No se pudo registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F6F8FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>GMMCIA</Text>
          <Text style={styles.appSubtitle}>Accedé a centros y filtros inteligentes</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Contraseña</Text>
          <TextInput
            value={pass}
            onChangeText={setPass}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Repetir contraseña</Text>
          <TextInput
            value={pass2}
            onChangeText={setPass2}
            placeholder="Repetir contraseña"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity onPress={onRegister} style={styles.primaryBtn} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? 'Creando…' : 'Crear cuenta'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => nav.goBack()} style={{ marginTop: 12 }}>
            <Text style={styles.linkText}>¿Ya tenés cuenta? Iniciá sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#2563EB';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const SUBTEXT = '#475569';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoWrap: { alignItems: 'center', marginTop: 32, marginBottom: 12 },
  logo: { width: 120, height: 120 },
  appTitle: { marginTop: 8, fontSize: 22, fontWeight: '800', color: TEXT },
  appSubtitle: { color: SUBTEXT, marginTop: 4, fontSize: 13, textAlign: 'center' },

  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginTop: 12,
  },

  label: { color: TEXT, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    backgroundColor: '#fff',
    color: TEXT,
  },

  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkText: { color: PRIMARY, fontWeight: '700', textAlign: 'center' },
});
