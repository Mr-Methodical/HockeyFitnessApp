import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { testStorageConnection } from '../services/team';

// Debug component to show Firebase connection status
const FirebaseDebugInfo = ({ visible = false }) => {
  const { isConnected, forceReconnect } = useAuth();
  const [storageTestResult, setStorageTestResult] = useState(null);
  const [testingStorage, setTestingStorage] = useState(false);

  const handleStorageTest = async () => {
    setTestingStorage(true);
    setStorageTestResult(null);
    
    try {
      const result = await testStorageConnection();
      setStorageTestResult(result);
    } catch (error) {
      setStorageTestResult({ success: false, error: error.message });
    } finally {
      setTestingStorage(false);
    }
  };

  if (!visible || !__DEV__) return null;

  return (
    <View style={styles.debugContainer}>
      <View style={styles.statusRow}>
        <MaterialIcons 
          name={isConnected ? "cloud-done" : "cloud-off"} 
          size={16} 
          color={isConnected ? "#4CAF50" : "#F44336"} 
        />
        <Text style={[styles.statusText, { color: isConnected ? "#4CAF50" : "#F44336" }]}>
          {isConnected ? "Connected" : "Offline"}
        </Text>
        {!isConnected && (
          <TouchableOpacity style={styles.retryButton} onPress={forceReconnect}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={handleStorageTest}
        disabled={testingStorage}
      >
        <Text style={styles.testButtonText}>
          {testingStorage ? 'Testing Storage...' : 'Test Storage'}
        </Text>
      </TouchableOpacity>
      
      {storageTestResult && (
        <View style={[styles.resultContainer, { 
          backgroundColor: storageTestResult.success ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)' 
        }]}>
          <Text style={[styles.resultText, { 
            color: storageTestResult.success ? '#4CAF50' : '#F44336' 
          }]}>
            {storageTestResult.success ? '✅ Storage OK' : `❌ ${storageTestResult.error}`}
          </Text>
        </View>
      )}
      
      <Text style={styles.debugNote}>
        Note: WebChannel warnings in development are normal
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  resultText: {
    fontSize: 10,
    fontWeight: '600',
  },
  debugNote: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default FirebaseDebugInfo;
