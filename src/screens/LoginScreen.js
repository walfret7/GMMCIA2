import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { authMsg } from '../utils/authErrors';

export default function LoginScreen() {
  const nav = useNavigation();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Chequeo robusto de existencia de usuario (dos intentos)
  const checkUserExists = async (e) => {
    try {
      const m1 = await auth().fetchSignInMethodsForEmail(e);
      if (Array.isArray(m1)) {
        if (m1.length === 0) return false;
        return true;
      }
      await sleep(250);
      const m2 = await auth().fetchSignInMethodsForEmail(e);
      if (Array.isArray(m2)) {
        if (m2.length === 0) return false;
        return true;
      }
      return null; // indeterminado
    } catch {
      return null; // indeterminado (red/SDK)
    }
  };

  const login = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !pass) {
      Alert.alert('Faltan datos', 'Completá email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(e, pass);
      // OK
    } catch (err) {
      const code = err?.code || '';

      if (code === 'auth/invalid-email') {
        Alert.alert('No se pudo ingresar', 'Email inválido.');
        return;
      }

      if (code === 'auth/user-not-found') {
        Alert.alert(
          'Cuenta no encontrada',
          'No existe una cuenta con ese email. ¿Querés crearla ahora?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Crear cuenta', onPress: () => nav.navigate('Register', { presetEmail: e }) },
          ]
        );
        return;
      }

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        const exists = await checkUserExists(e);
        if (exists === true) {
          Alert.alert('No se pudo ingresar', 'Contraseña incorrecta.');
        } else if (exists === false) {
          Alert.alert(
            'Cuenta no encontrada',
            'No existe una cuenta con ese email. ¿Querés crearla ahora?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Crear cuenta', onPress: () => nav.navigate('Register', { presetEmail: e }) },
            ]
          );
        } else {
          Alert.alert('No se pudo ingresar', 'No se pudo verificar tu cuenta. Revisá tu conexión e intentá de nuevo.');
        }
        return;
      }

      if (code === 'auth/network-request-failed') {
        Alert.alert('No se pudo ingresar', 'Sin conexión. Intentá de nuevo.');
        return;
      }

      Alert.alert('No se pudo ingresar', authMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={pass}
        onChangeText={setPass}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button title={loading ? 'Ingresando…' : 'INGRESAR'} onPress={login} disabled={loading} />
      <View style={{ height: 8 }} />
      <Button
        title="CREAR CUENTA"
        onPress={() => nav.navigate('Register', { presetEmail: email.trim().toLowerCase() })}
      />
    </View>
  );
}
