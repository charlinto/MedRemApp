const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendMedicationReminder = async (email, medicationName, dosage, time) => {
  // Validate required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Time to take your ${medicationName}`,
    text: `This is a reminder to take ${dosage} of ${medicationName} at ${time}.`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email reminder sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error.message);
    throw error; // Re-throw to let caller handle
  }
};

module.exports = { sendMedicationReminder };