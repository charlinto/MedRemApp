const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendMedicationReminder } = require('./emailService');
const { sendPushNotification } = require('./pushNotificationService');

// Check every minute for due reminders
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const upcomingReminders = await Reminder.find({
    scheduledTime: { $lte: new Date(now.getTime() + 5 * 60000) }, // 5 minutes buffer
    status: 'pending',
    notificationSent: false
  }).populate('user').populate('medication');

  for (const reminder of upcomingReminders) {
    try {
      // Send email notification
      await sendMedicationReminder(
        reminder.user.email,
        reminder.medication.name,
        reminder.medication.dosage,
        reminder.scheduledTime.toLocaleTimeString()
      );

      // Send push notification if device token exists
      if (reminder.user.deviceToken) {
        await sendPushNotification(
          reminder.user.deviceToken,
          reminder.medication.name,
          reminder.medication.dosage,
          reminder.scheduledTime.toLocaleTimeString()
        );
      }

      // Update reminder status
      reminder.notificationSent = true;
      await reminder.save();
    } catch (error) {
      console.error(`Error processing reminder ${reminder._id}:`, error);
    }
  }
});