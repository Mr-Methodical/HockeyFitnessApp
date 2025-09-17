# Firebase Push Notification Test Script

This Node.js script allows you to test Firebase Cloud Messaging (FCM) push notifications using the Firebase Admin SDK.

## ⚠️ Important Security Notice

**This script is for LOCAL TESTING ONLY.** The service account credentials are embedded directly in the code, which is NOT suitable for production use. In production environments, always use:
- Environment variables
- Secure credential management systems
- Firebase service account key files with proper access controls

## Setup Instructions

### 1. Install Dependencies

First, install the required dependencies:

```bash
# Copy the test package.json to package.json for this test
cp test-package.json package.json

# Install dependencies
npm install
```

### 2. Get a Registration Token

To test push notifications, you need a valid FCM registration token from your React Native app:

#### In your React Native app:
```javascript
import messaging from '@react-native-firebase/messaging';

// Get the token
const getToken = async () => {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
  return token;
};
```

#### Or use the existing Firebase setup:
```javascript
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging);
console.log('FCM Token:', token);
```

### 3. Update the Script

Replace the example token in `firebase-push-notification-test.js`:

```javascript
const exampleToken = 'YOUR_ACTUAL_FCM_REGISTRATION_TOKEN_HERE';
```

### 4. Run the Script

```bash
node firebase-push-notification-test.js
```

Or using npm:

```bash
npm test
```

## Script Features

- ✅ Firebase Admin SDK initialization with error handling
- ✅ FCM push notification sending with HTTP v1 API
- ✅ Comprehensive error handling for common FCM errors
- ✅ Support for both Android and iOS platforms
- ✅ Detailed logging and success/failure messages
- ✅ No sensitive information logged to console

## Using as a Module

You can also import and use the functions in other Node.js scripts:

```javascript
const { initializeFirebaseAdmin, sendPushNotification } = require('./firebase-push-notification-test');

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Send a notification
await sendPushNotification(
  'your-registration-token',
  'Custom Title',
  'Custom message body',
  { customData: 'value' }  // Optional data payload
);
```

## Error Handling

The script handles common FCM errors:

- **invalid-registration-token**: Token is malformed or expired
- **registration-token-not-registered**: App may be uninstalled
- **invalid-argument**: Message payload is invalid
- **quota-exceeded**: Too many messages sent

## Testing with Your Hockey Accountability App

1. Run your React Native app in development mode
2. Get the FCM token from the app logs
3. Update the script with the token
4. Run the test script
5. Check if the notification appears on your device

## Cleanup

After testing, you can remove the test files:

```bash
rm firebase-push-notification-test.js
rm test-package.json
```

## Security Best Practices for Production

- Never commit service account keys to version control
- Use environment variables: `process.env.FIREBASE_SERVICE_ACCOUNT`
- Use Firebase service account key files with restricted permissions
- Implement proper authentication and authorization
- Use Firebase Functions for server-side notification sending
- Regularly rotate service account keys
