const express = require('express');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const Medication = require('../models/Medication');
const Reminder = require('../models/Reminder');
const router = express.Router();

// @route   POST api/medications
// @desc    Create new medication
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('dosage', 'Dosage is required').not().isEmpty(),
      check('schedule', 'Schedule is required').isArray({ min: 1 }),
      check('schedule.*.time', 'Time is required for each schedule item').not().isEmpty(),
      check('schedule.*.days', 'Days are required for each schedule item').isArray({ min: 1 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, dosage, schedule, notes, startDate, endDate } = req.body;
      
      const medication = new Medication({
        user: req.user.id,
        name,
        dosage,
        schedule,
        notes,
        startDate: startDate || Date.now(),
        endDate: endDate || Date.now()
      });

      await medication.save();
      
      // Create reminders based on schedule
      await createRemindersForMedication(medication);
      
      res.json(medication);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/medications
// @desc    Get all user's medications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const medications = await Medication.find({ user: req.user.id })
      .sort({ startDate: -1 });
      
    res.json(medications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/medications/:id
// @desc    Get single medication
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const medication = await Medication.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!medication) {
      return res.status(404).json({ msg: 'Medication not found' });
    }

    res.json(medication);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Medication not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/medications/:id
// @desc    Update medication
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('dosage', 'Dosage is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let medication = await Medication.findOne({
        _id: req.params.id,
        user: req.user.id
      });

      if (!medication) {
        return res.status(404).json({ msg: 'Medication not found' });
      }

      const { name, dosage, schedule, notes, startDate, endDate } = req.body;

      // Update medication
      medication.name = name;
      medication.dosage = dosage;
      medication.schedule = schedule || medication.schedule;
      medication.notes = notes;
      medication.startDate = startDate || medication.startDate;
      medication.endDate = endDate;

      await medication.save();

      // Optional: Update existing reminders or create new ones
      // This could be more sophisticated based on your needs
      if (schedule) {
        await Reminder.deleteMany({ 
          medication: medication._id,
          status: 'pending'
        });
        await createRemindersForMedication(medication);
      }

      res.json(medication);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Medication not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/medications/:id
// @desc    Delete medication
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const medication = await Medication.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!medication) {
      return res.status(404).json({ msg: 'Medication not found' });
    }

    // Delete associated reminders
    await Reminder.deleteMany({ medication: medication._id });

    // Delete medication itself
    await Medication.deleteOne({ _id: medication._id });

    res.json({ msg: 'Medication removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Medication not found' });
    }
    res.status(500).send('Server error');
  }
});


// Helper function to create reminders
async function createRemindersForMedication(medication) {
  try {
    // Delete any existing pending reminders for this medication
    await Reminder.deleteMany({ 
      medication: medication._id,
      status: 'pending'
    });

    // Create new reminders based on the schedule
    for (const scheduleItem of medication.schedule) {
      const days = scheduleItem.days.map(day => day.toLowerCase());
      const [hours, minutes] = scheduleItem.time.split(':').map(Number);
      
      // Create reminders for the next 30 days (adjust as needed)
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        // Check if this day of week is in the schedule
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        
        if (days.includes(dayName)) {
          const reminderDate = new Date(date);
          reminderDate.setHours(hours, minutes, 0, 0);
          
          // Skip if before current time
          if (reminderDate < new Date()) continue;
          
          // Skip if after medication end date
          if (medication.endDate && reminderDate > new Date(medication.endDate)) continue;
          
          const reminder = new Reminder({
            user: medication.user,
            medication: medication._id,
            scheduledTime: reminderDate,
            status: 'pending'
          });
          
          await reminder.save();
        }
      }
    }
  } catch (err) {
    console.error('Error creating reminders:', err.message);
    throw err;
  }
}

module.exports = router;