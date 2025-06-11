const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  schedule: [{
    time: String, // e.g., "08:00"
    days: [String] // e.g., ["Monday", "Wednesday", "Friday"]
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  notes: String
});

module.exports = mongoose.model('Medication', MedicationSchema);