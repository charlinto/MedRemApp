const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const sendPushNotification = async (deviceToken, medicationName, dosage, time) => {
  const message = {
    notification: {
      title: `Time to take ${medicationName}`,
      body: `Reminder: Take ${dosage} at ${time}`
    },
    token: deviceToken
  };

  try {
    await admin.messaging().send(message);
    console.log('Push notification sent');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

module.exports = { sendPushNotification };