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
import { signUp, USER_ROLES } from '../services/auth';
import { useTheme } from '../utils/ThemeContext';

const SignupScreen = ({ navigation }) => {
  const { currentTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !selectedRole) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, {
        name,
        role: selectedRole
      });
      // Navigation will be handled by the auth state change
    } catch (error) {
      Alert.alert('Signup Failed', error.message);
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
          <Text style={[styles.title, { color: currentTheme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>Join your team or create a group</Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />

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
              autoComplete="password-new"
            />

            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />

            <Text style={[styles.roleLabel, { color: currentTheme.text }]}>I am a:</Text>
            
            {/* Sports Section */}
            <View style={styles.roleSection}>
              <Text style={[styles.sectionHeader, { color: currentTheme.textSecondary }]}>——— Sports ———</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { backgroundColor: currentTheme.surface, borderColor: currentTheme.border },
                    selectedRole === USER_ROLES.COACH && { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }
                  ]}
                  onPress={() => setSelectedRole(USER_ROLES.COACH)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: currentTheme.text },
                    selectedRole === USER_ROLES.COACH && { color: '#fff' }
                  ]}>
                    Coach
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    { backgroundColor: currentTheme.surface, borderColor: currentTheme.border },
                    selectedRole === USER_ROLES.PLAYER && { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }
                  ]}
                  onPress={() => setSelectedRole(USER_ROLES.PLAYER)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: currentTheme.text },
                    selectedRole === USER_ROLES.PLAYER && { color: '#fff' }
                  ]}>
                    Player
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* General Section */}
            <View style={styles.roleSection}>
              <Text style={[styles.sectionHeader, { color: currentTheme.textSecondary }]}>——— General ———</Text>
              <View style={styles.singleRoleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    styles.singleRoleButton,
                    { backgroundColor: currentTheme.surface, borderColor: currentTheme.border },
                    selectedRole === USER_ROLES.GROUP_MEMBER && { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }
                  ]}
                  onPress={() => setSelectedRole(USER_ROLES.GROUP_MEMBER)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    { color: currentTheme.text },
                    selectedRole === USER_ROLES.GROUP_MEMBER && { color: '#fff' }
                  ]}>
                    Group Member
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.roleHelper, { color: currentTheme.textMuted }]}>create or join a group</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: currentTheme.primary }, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.linkText, { color: currentTheme.primary }]}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
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
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  roleSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  singleRoleContainer: {
    alignItems: 'center',
  },
  roleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  singleRoleButton: {
    flex: 0,
    minWidth: 200,
    maxWidth: 250,
  },
  roleHelper: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  roleButtonSelected: {
    // Theme colors now applied directly in JSX
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    // Theme colors now applied directly in JSX
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

export default SignupScreen;
