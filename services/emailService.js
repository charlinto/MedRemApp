const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendMedicationReminder = async (email, medicationName, dosage, time) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Time to take your ${medicationName}`,
    text: `This is a reminder to take ${dosage} of ${medicationName} at ${time}.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email reminder sent');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendMedicationReminder };