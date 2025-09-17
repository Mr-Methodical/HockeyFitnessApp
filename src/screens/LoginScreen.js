import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { signIn } from '../services/auth';
import { useTheme } from '../utils/ThemeContext';
import FirebaseDebugInfo from '../components/FirebaseDebugInfo';

const LoginScreen = ({ navigation }) => {
  const { currentTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled by the auth state change
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: currentTheme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.appTitle}>Hockey Rivals</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>Sign in to continue</Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: currentTheme.primary }, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={[styles.linkText, { color: currentTheme.primary }]}>
                Don't have an account? Sign up
              </Text>
            </TouchableOpacity>
          </View>
          
          <FirebaseDebugInfo visible={true} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    color: '#DC143C', // Fierce red color (Crimson)
    letterSpacing: 1.5,
    textShadowColor: 'rgba(220, 20, 60, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
  },
});

export default LoginScreen;
