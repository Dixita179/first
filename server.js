const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const QRCode = require('qrcode'); // Import QRCode library
require('dotenv').config(); // to use environment variables
const paypal = require('@paypal/checkout-server-sdk');

// Initialize Express App
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Allow CORS for all routes

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/groceryMartDB', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

// User Model
const User = mongoose.model('User', userSchema);

// PayPal SDK Configuration
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Register Route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!email || !password || !username) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();

  res.status(201).json({ message: 'User registered successfully' });
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  // Compare password with hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Create JWT Token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

  res.json({ token });
});

// Generate QR Code Route
app.post('/generate-qr', async (req, res) => {
  const { data } = req.body;  // The data you want to encode in the QR code

  if (!data) {
    return res.status(400).json({ message: 'Data is required to generate a QR code' });
  }

  try {
    // Generate QR code as a Data URL (base64-encoded image)
    const qrCodeImage = await QRCode.toDataURL(data);

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      qrCodeImage: qrCodeImage,  // Return the QR code image in base64 format
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Error generating QR code' });
  }
});

// PayPal Order Creation Route
app.post('/create-paypal-order', async (req, res) => {
  const { amount } = req.body; // Amount sent from the frontend

  if (!amount) {
    return res.status(400).json({ message: 'Amount is required' });
  }

  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD', // or 'INR' if you're using INR
          value: amount, // amount sent from frontend
        },
      }],
      application_context: {
        return_url: 'http://localhost:5000/execute-paypal-payment', // where PayPal redirects after payment approval
        cancel_url: 'http://localhost:5000/payment-cancelled',
      },
    });

    const order = await paypalClient.execute(request);
    res.json({ orderID: order.result.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating PayPal order' });
  }
});

// PayPal Payment Execution Route
app.post('/execute-paypal-payment', async (req, res) => {
  const { orderID, payerID } = req.body;

  if (!orderID || !payerID) {
    return res.status(400).json({ message: 'Order ID and Payer ID are required' });
  }

  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    if (capture.status === 'COMPLETED') {
      // Payment successful
      res.json({ message: 'Payment successful', captureDetails: capture.result });
    } else {
      res.status(500).json({ message: 'Payment capture failed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error executing PayPal payment' });
  }
});

// Handle Payment Cancellation Route
app.get('/payment-cancelled', (req, res) => {
  res.send('Payment was cancelled.');
});

// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
