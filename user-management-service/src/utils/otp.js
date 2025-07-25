// This file provides utilities for generating and verifying OTPs.
const otpGenerator = require('otp-generator');
const crypto = require('crypto');
const config = require('../config');

// In a real application, you would use Redis or a database to store OTPs
// For MVP, we'll use a simple in-memory map (NOT for production!)
const otpStore = new Map(); // Map to store {mobileNumber: {otp: hashedOtp, expiry: timestamp}}

/**
 * Generates an OTP and stores it securely.
 * @param {string} mobileNumber - The mobile number for which to generate OTP.
 * @returns {string} The generated OTP.
 */
const generateAndStoreOTP = (mobileNumber) => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });

  const hash = crypto.createHmac('sha256', config.otpSecret)
                     .update(otp)
                     .digest('hex');

  const expiry = Date.now() + config.otpExpiryMinutes * 60 * 1000; // OTP expiry time

  otpStore.set(mobileNumber, { hash, expiry });
  console.log(`Generated OTP for ${mobileNumber}: ${otp} (Expires in ${config.otpExpiryMinutes} minutes)`); // For testing only! Remove in production.
  return otp;
};

/**
 * Verifies an OTP.
 * @param {string} mobileNumber - The mobile number.
 * @param {string} otp - The OTP to verify.
 * @returns {boolean} True if OTP is valid and not expired, false otherwise.
 */
const verifyOTP = (mobileNumber, otp) => {
  const storedOtpData = otpStore.get(mobileNumber);

  if (!storedOtpData) {
    return false; // No OTP generated for this number
  }

  if (Date.now() > storedOtpData.expiry) {
    otpStore.delete(mobileData); // OTP expired, remove it
    return false;
  }

  const hashToVerify = crypto.createHmac('sha256', config.otpSecret)
                             .update(otp)
                             .digest('hex');

  if (hashToVerify === storedOtpData.hash) {
    otpStore.delete(mobileNumber); // OTP successfully verified, remove it
    return true;
  }

  return false;
};

/**
 * Simulates sending an OTP via SMS.
 * In a real app, this would integrate with an SMS provider (e.g., Twilio, SendGrid).
 * @param {string} mobileNumber - The recipient's mobile number.
 * @param {string} otp - The OTP to send.
 */
const sendOTP = async (mobileNumber, otp) => {
  // This is a placeholder for actual SMS sending logic.
  // In a real app, you would make an API call to an SMS provider here.
  console.log(`--- SIMULATING SMS SEND ---`);
  console.log(`To: ${mobileNumber}`);
  console.log(`Message: Your OTP is ${otp}. It is valid for ${config.otpExpiryMinutes} minutes.`);
  console.log(`---------------------------`);
  // You would typically await the SMS provider's response here
  return true; // Simulate success
};

module.exports = { generateAndStoreOTP, verifyOTP, sendOTP };