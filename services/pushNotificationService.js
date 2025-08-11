const admin = require('firebase-admin');

// Initialize Firebase Admin only if credentials are available
let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    firebaseInitialized = true;
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase credentials not found. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
}

const sendPushNotification = async (deviceToken, medicationName, dosage, time) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping push notification.');
    return false;
  }

  const message = {
    notification: {
      title: `Time to take ${medicationName}`,
      body: `Reminder: Take ${dosage} at ${time}`
    },
    token: deviceToken
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`Push notification sent to ${deviceToken}:`, response);
    return true;
  } catch (error) {
    console.error(`Error sending push notification to ${deviceToken}:`, error.message);
    throw error; // Re-throw to let caller handle
  }
};

module.exports = { sendPushNotification };