// Comprehensive error handling for Firebase operations
import { Alert } from 'react-native';

export class AppError extends Error {
  constructor(message, code = 'unknown', details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Firebase error code mappings
const FIREBASE_ERROR_MESSAGES = {
  // Auth errors
  'auth/email-already-in-use': 'This email address is already registered. Please use a different email or try signing in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested information was not found.',
  'already-exists': 'This information already exists.',
  'failed-precondition': 'Operation rejected due to invalid state. Please refresh and try again.',
  'unauthenticated': 'Please sign in to continue.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'cancelled': 'Operation was cancelled.',
  'data-loss': 'Data corrupted. Please try again.',
  'invalid-argument': 'Invalid data provided.',
  'out-of-range': 'Value out of valid range.',
  
  // Storage errors
  'storage/object-not-found': 'File not found.',
  'storage/unauthorized': 'Not authorized to access this file.',
  'storage/cancelled': 'Upload cancelled.',
  'storage/unknown': 'Unknown storage error occurred.',
  'storage/invalid-format': 'Invalid file format.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  
  // Network errors
  'network-error': 'Network connection failed. Please check your internet connection.',
  'timeout': 'Request timed out. Please try again.',
};

// Default error message
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

// Error handling utility functions
export const errorHandler = {
  // Get user-friendly error message
  getErrorMessage(error) {
    if (!error) return DEFAULT_ERROR_MESSAGE;
    
    // Check if it's a custom AppError
    if (error instanceof AppError) {
      return error.message;
    }
    
    // Check Firebase error codes
    if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
      return FIREBASE_ERROR_MESSAGES[error.code];
    }
    
    // Check for network errors
    if (error.message && error.message.includes('network')) {
      return FIREBASE_ERROR_MESSAGES['network-error'];
    }
    
    // Return original message if it's user-friendly, otherwise default
    if (error.message && error.message.length < 100) {
      return error.message;
    }
    
    return DEFAULT_ERROR_MESSAGE;
  },

  // Handle error with optional alert
  handleError(error, context = '', showAlert = true) {
    const message = this.getErrorMessage(error);
    const fullContext = context ? `${context}: ${message}` : message;
    
    // Log error for debugging
    console.error(`Error in ${context}:`, error);
    
    if (showAlert) {
      Alert.alert('Error', message);
    }
    
    return { success: false, error: message, context: fullContext };
  },

  // Handle async operations with error handling
  async handleAsync(operation, context = '', showAlert = true) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error, context, showAlert);
    }
  },

  // Retry mechanism for failed operations
  async retry(operation, maxAttempts = 3, delay = 1000, context = '') {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`${context} succeeded on attempt ${attempt}`);
        }
        return { success: true, data: result };
      } catch (error) {
        console.warn(`${context} attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain error types
        if (error.code === 'permission-denied' || 
            error.code === 'unauthenticated' ||
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/user-not-found') {
          return this.handleError(error, context);
        }
        
        // If this was the last attempt, handle the error
        if (attempt === maxAttempts) {
          return this.handleError(error, context);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  },

  // Validate required fields
  validateRequired(data, requiredFields, context = 'Validation') {
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      const error = new AppError(
        `Missing required fields: ${missing.join(', ')}`,
        'validation-error',
        { missingFields: missing }
      );
      return this.handleError(error, context);
    }
    
    return { success: true };
  },

  // Network connectivity check
  async checkConnectivity() {
    try {
      // Simple connectivity test
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

// Error boundary helper for React components
export const withErrorBoundary = (Component, fallbackComponent = null) => {
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error('Error boundary caught an error:', error, errorInfo);
      errorHandler.handleError(error, 'React Error Boundary', false);
    }

    render() {
      if (this.state.hasError) {
        if (fallbackComponent) {
          return fallbackComponent;
        }
        
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              Oops! Something went wrong
            </Text>
            <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
              {errorHandler.getErrorMessage(this.state.error)}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#2196F3',
                padding: 12,
                borderRadius: 8,
              }}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return <Component {...this.props} />;
    }
  };
};

export default errorHandler;
