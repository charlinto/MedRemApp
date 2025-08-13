const express = require('express');
const Reminder = require('../models/Reminder');
const { sendMedicationReminder } = require('../utils/emailService');

const router = express.Router();

router.get('/reminder-job', async (req, res) => {
  try {
    const now = new Date();
    const upcoming = await Reminder.find({
      scheduledTime: { $lte: new Date(now.getTime() + 5 * 60000) },
      status: 'pending',
      notificationSent: false,
    }).populate('user').populate('medication');

    const results = [];
    for (const r of upcoming) {
      const out = { reminderId: r._id.toString(), status: '' };
      try {
        await sendMedicationReminder(
          r.user.email,
          r.medication.name,
          r.medication.dosage,
          r.scheduledTime.toLocaleTimeString()
        );

        r.notificationSent = true;
        await r.save();
        out.status = 'sent';
      } catch (err) {
        out.status = 'error';
        out.error = err.message;
      }
      results.push(out);
    }

    res.json({ success: true, processed: results.length, details: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
