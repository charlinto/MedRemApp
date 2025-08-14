const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendMedicationReminder } = require('./emailService');
const { sendPushNotification } = require('./pushNotificationService');

console.log('Medication reminder scheduler initialized');

// Check every minute for due reminders
const task = cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const upcomingReminders = await Reminder.find({
      scheduledTime: { $lte: new Date(now.getTime() + 5 * 60000) }, // 5 minutes buffer
      status: 'pending',
      notificationSent: false
    }).populate('user').populate('medication');

    if (upcomingReminders.length > 0) {
      console.log(`Processing ${upcomingReminders.length} reminder(s) at ${now.toISOString()}`);
    }

    for (const reminder of upcomingReminders) {
      try {
        // Validate required data exists
        if (!reminder.user || !reminder.medication) {
          console.error(`Invalid reminder data for ${reminder._id}: missing user or medication`);
          continue;
        }

        if (!reminder.user.email) {
          console.error(`No email found for user ${reminder.user._id}`);
          continue;
        }

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
        
        console.log(`Successfully processed reminder ${reminder._id} for user ${reminder.user.email}`);
      } catch (error) {
        console.error(`Error processing reminder ${reminder._id}:`, error);
        // Continue processing other reminders even if one fails
      }
    }
  } catch (error) {
    console.error('Error in scheduler cron job:', error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Lagos" // West Africa Time (WAT)
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping medication reminder scheduler...');
  task.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping medication reminder scheduler...');
  task.destroy();
  process.exit(0);
});