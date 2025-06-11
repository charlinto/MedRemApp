const express = require('express');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Reminder = require('../models/Reminder');
const Medication = require('../models/Medication');
const router = express.Router();


// @route   PATCH api/reminders/:id/complete
// @desc    Mark reminder as completed
// @access  Private
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        status: 'completed',
        actualTimeTaken: new Date() 
      },
      { new: true }
    ).populate('medication', 'name dosage');

    if (!reminder) {
      return res.status(404).json({ msg: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==============================================
// 🔍 GET ALL REMINDERS (with Filters)
// ==============================================
router.get('/', auth, async (req, res) => {
  try {
    // Build query filters
    const filters = { user: req.user.id };
    
    // Date range filter (e.g., ?from=2023-10-01&to=2023-10-31)
    if (req.query.from || req.query.to) {
      filters.scheduledTime = {};
      if (req.query.from) filters.scheduledTime.$gte = new Date(req.query.from);
      if (req.query.to) filters.scheduledTime.$lte = new Date(req.query.to);
    }

    // Status filter (e.g., ?status=pending)
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const reminders = await Reminder.find(filters)
      .populate('medication', 'name dosage')
      .sort({ scheduledTime: 1 });

    res.json(reminders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==============================================
// ✅ MARK AS COMPLETED/MISSED
// ==============================================
router.patch(
  '/:id/status',
  [
    auth,
    [
      check('status', 'Status is required')
        .isIn(['completed', 'missed'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updateData = {
        status: req.body.status,
        ...(req.body.status === 'completed' && { actualTimeTaken: new Date() })
      };

      const reminder = await Reminder.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        updateData,
        { new: true }
      ).populate('medication', 'name dosage');

      if (!reminder) {
        return res.status(404).json({ msg: 'Reminder not found' });
      }

      res.json(reminder);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// ==============================================
// 📅 GET DAILY SUMMARY (For Mobile App Dashboard)
// ==============================================
router.get('/daily-summary', auth, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const reminders = await Reminder.find({
      user: req.user.id,
      scheduledTime: { $gte: todayStart, $lte: todayEnd }
    }).populate('medication', 'name dosage');

    const stats = {
      total: reminders.length,
      completed: reminders.filter(r => r.status === 'completed').length,
      pending: reminders.filter(r => r.status === 'pending').length,
      medications: [...new Set(reminders.map(r => r.medication.name))]
    };

    res.json({ reminders, stats });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;