
// screens/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authResetPassword } from '@/requests/auth.requests';
import { router } from 'expo-router';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setLoading(true);
      await authResetPassword(email.toLowerCase());
      setEmailSent(true);
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Une erreur est survenue. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color="#10b981" />
          </View>
          
          <Text style={styles.successTitle}>Email envoyé ! 📧</Text>
          
          <Text style={styles.successText}>
            Si un compte existe avec l'adresse <Text style={styles.emailText}>{email}</Text>,
            vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Vérifiez également vos spams si vous ne trouvez pas l'email.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Retour à la connexion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => setEmailSent(false)}
          >
            <Text style={styles.resendButtonText}>Renvoyer l'email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          {/* <Ionicons name="close" size={28} color="#64748b" /> */}
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={50} color="#667eea" />
          </View>
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.subtitle}>
            Pas de souci, nous allons vous envoyer un lien pour le réinitialiser.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Votre adresse email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Envoyer le lien</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color="#667eea" />
            <Text style={styles.loginButtonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpBox}>
          <Ionicons name="help-circle-outline" size={20} color="#64748b" />
          <Text style={styles.helpText}>
            Besoin d'aide ? Contactez-nous à{' '}
            <Text style={styles.helpLink}>rdsconnect.contact@gmail.com</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: '#fff',
  },

  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },

  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },

  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  lockIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  form: {
    marginBottom: 30,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#0f172a',
  },

  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },

  loginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },

  loginButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },

  helpBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },

  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },

  helpLink: {
    color: '#667eea',
    fontWeight: '600',
  },

  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },

  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },

  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  emailText: {
    fontWeight: '600',
    color: '#0f172a',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },

  backButton: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },

  resendButton: {
    paddingVertical: 12,
  },

  resendButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
