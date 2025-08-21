/**
 * Firestore Health Check and Recovery Utilities
 * Helps diagnose and fix Firestore internal assertion errors
 */

import { db } from './firebase';
import { doc, getDoc, enableNetwork, disableNetwork, clearIndexedDbPersistence, terminate } from 'firebase/firestore';

/**
 * Check if Firestore is healthy and responsive
 */
export const checkFirestoreHealth = async () => {
  try {
    console.log('🏥 Checking Firestore health...');
    
    // Simple read test
    const testRef = doc(db, 'health', 'test');
    await getDoc(testRef);
    
    console.log('✅ Firestore health check passed');
    return true;
    
  } catch (error) {
    console.error('❌ Firestore health check failed:', error);
    
    if (error.message.includes('Internal assertion failed')) {
      console.log('🔧 Detected internal assertion error - attempting recovery...');
      return await recoverFromInternalError();
    }
    
    return false;
  }
};

/**
 * Attempt to recover from Firestore internal assertion errors
 */
export const recoverFromInternalError = async () => {
  try {
    console.log('🔄 Attempting Firestore recovery...');
    
    // Step 1: Disable network to force offline mode
    console.log('📴 Disabling Firestore network...');
    await disableNetwork(db);
    
    // Step 2: Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Re-enable network
    console.log('📶 Re-enabling Firestore network...');
    await enableNetwork(db);
    
    // Step 4: Test connection
    const testRef = doc(db, 'health', 'test');
    await getDoc(testRef);
    
    console.log('✅ Firestore recovery successful');
    return true;
    
  } catch (recoveryError) {
    console.error('❌ Firestore recovery failed:', recoveryError);
    return await fallbackRecovery();
  }
};

/**
 * Fallback recovery method - more aggressive
 */
const fallbackRecovery = async () => {
  try {
    console.log('🔄 Attempting fallback recovery...');
    
    // Clear IndexedDB persistence (web only)
    if (typeof window !== 'undefined') {
      try {
        await clearIndexedDbPersistence(db);
        console.log('🗑️ Cleared IndexedDB persistence');
      } catch (clearError) {
        console.log('⚠️ Could not clear persistence (may not be needed)');
      }
    }
    
    // Wait before testing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test connection again
    const testRef = doc(db, 'health', 'test');
    await getDoc(testRef);
    
    console.log('✅ Fallback recovery successful');
    return true;
    
  } catch (fallbackError) {
    console.error('❌ All recovery attempts failed:', fallbackError);
    return false;
  }
};

/**
 * Emergency Firestore restart (use only as last resort)
 */
export const emergencyFirestoreRestart = async () => {
  try {
    console.log('🚨 Emergency Firestore restart initiated...');
    
    // Terminate the Firestore instance
    await terminate(db);
    console.log('🛑 Firestore terminated');
    
    // Wait before allowing reconnection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔄 Firestore will reinitialize on next operation');
    return true;
    
  } catch (error) {
    console.error('❌ Emergency restart failed:', error);
    return false;
  }
};

/**
 * Run comprehensive Firestore diagnostics
 */
export const runFirestoreDiagnostics = async () => {
  console.log('🔍 Running Firestore diagnostics...');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    healthy: false,
    errors: [],
    recommendations: []
  };
  
  try {
    // Test basic connectivity
    diagnostics.healthy = await checkFirestoreHealth();
    
    if (!diagnostics.healthy) {
      diagnostics.errors.push('Firestore health check failed');
      diagnostics.recommendations.push('Try restarting the app');
      diagnostics.recommendations.push('Check internet connection');
      diagnostics.recommendations.push('Verify Firebase configuration');
    }
    
  } catch (error) {
    diagnostics.errors.push(`Diagnostics error: ${error.message}`);
    
    if (error.message.includes('Internal assertion failed')) {
      diagnostics.recommendations.push('Restart the app to clear internal state');
      diagnostics.recommendations.push('If persistent, check Firebase console for issues');
    }
  }
  
  console.log('📊 Firestore Diagnostics:', diagnostics);
  return diagnostics;
};

/**
 * Automatic error handler for Firestore operations
 */
export const withFirestoreErrorHandler = async (operation, operationName = 'Firestore operation') => {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);
    
    if (error.message.includes('Internal assertion failed')) {
      console.log('🔧 Internal assertion error detected, attempting auto-recovery...');
      
      const recovered = await recoverFromInternalError();
      if (recovered) {
        console.log('🔄 Retrying operation after recovery...');
        return await operation();
      } else {
        console.error('❌ Auto-recovery failed, operation aborted');
        throw new Error(`${operationName} failed and auto-recovery unsuccessful. Please restart the app.`);
      }
    }
    
    throw error;
  }
};
