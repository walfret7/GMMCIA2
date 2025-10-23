import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authMsg } from '../utils/authErrors';

export default function RegisterScreen() {
  const nav = useNavigation();
  const route = useRoute();

  // Si llegamos desde Login con presetEmail, lo usamos de valor inicial
  const initialEmail = (route.params?.presetEmail || '').toString();

  const [email, setEmail] = useState(initialEmail);
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    const e = email.trim();

    if (!e || !pass) {
      Alert.alert('Faltan datos', 'Completá email y contraseña.');
      return;
    }
    if (pass.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await auth().createUserWithEmailAndPassword(e, pass);
      // Firebase deja logueado automáticamente tras crear la cuenta
    } catch (err) {
      // Caso especial: email ya registrado → ofrecer ir a Login con prefill
      if (err?.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Email ya en uso',
          'Ese email ya tiene una cuenta. ¿Querés ingresar con esa cuenta?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ingresar', onPress: () => nav.navigate('Login', { presetEmail: e }) },
          ]
        );
        return;
      }

      // Resto de errores mapeados
      Alert.alert('No se pudo crear la cuenta', authMsg(err));
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
        placeholder="Contraseña (mín. 6)"
        secureTextEntry
        value={pass}
        onChangeText={setPass}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button
        title={loading ? 'Creando…' : 'CREAR CUENTA'}
        onPress={register}
        disabled={loading}
      />
    </View>
  );
}
