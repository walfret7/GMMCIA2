export function authMsg(e) {
  const code = e?.code || '';
  switch (code) {
    case 'auth/invalid-email':        return 'Email inválido.';
    case 'auth/user-not-found':       return 'No existe una cuenta con ese email.';
    case 'auth/wrong-password':       return 'Contraseña incorrecta.';
    case 'auth/weak-password':        return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/email-already-in-use': return 'Ese email ya está en uso.';
    case 'auth/too-many-requests':    return 'Demasiados intentos. Intenta más tarde.';
    default:                          return e?.message || 'Ocurrió un error.';
  }
}
