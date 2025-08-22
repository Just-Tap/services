// src/app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const loanRoutes = require('./routes/loan');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Create 'uploads' directory and its subdirectories if they don't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const subDirs = ['selfies', 'address_proofs', 'bank_statements'];
subDirs.forEach(dirName => {
  const dirPath = path.join(uploadDir, dirName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true })); 


// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadDir));

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payment', paymentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Loan Management Service API is running...');
});

module.exports = app;
