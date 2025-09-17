/**
 * Add this to any screen to test Firebase Storage
 * Import and call testStorageFromScreen() after user logs in
 */

import { testStorageFromScreen, completeStorageTest } from '../services/completeStorageTest';

// Example: Add this button to your AI Workout screen or any screen
const StorageTestButton = () => (
  <TouchableOpacity 
    style={{ backgroundColor: 'blue', padding: 10, margin: 10 }}
    onPress={testStorageFromScreen}
  >
    <Text style={{ color: 'white' }}>Test Firebase Storage</Text>
  </TouchableOpacity>
);

// Or call directly in console:
// completeStorageTest();
