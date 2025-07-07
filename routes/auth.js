const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ email, password });  // Just assign raw password

    await user.save();  // Pre-save hook hashes it

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '99h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// Login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
    
//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    
//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     console.log('Login attempt:', { email, passwordMatch: isMatch }); // Debug log
//     if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    
//     // Create JWT
//     const payload = { user: { id: user.id } };
//     jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '84h' }, (err, token) => {
//       if (err) {
//         console.error('JWT error:', err);
//         return res.status(500).send('Server error');
//       }
//       res.json({ token });
//     });
//   } catch (err) {
//     console.error('Login error:', err.message);
//     res.status(500).send('Server error');
//   }
// });


router.post('/login', async (req, res) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Login attempt:', { email, passwordMatch: isMatch });

    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '84h' }, (err, token) => {
      if (err) {
        console.error('JWT error:', err);
        return res.status(500).send('Server error');
      }

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
});





module.exports = router;