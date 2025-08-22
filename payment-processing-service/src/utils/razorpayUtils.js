// This file contains utility functions for interacting with Razorpay.
const crypto = require('crypto');
const config = require('../config');

/**
 * Verifies the Razorpay webhook signature.
 * This is crucial for security to ensure the webhook request is genuinely from Razorpay.
 * @param {string} body - The raw request body of the webhook.
 * @param {string} signature - The X-Razorpay-Signature header from the webhook request.
 * @returns {boolean} - True if the signature is valid, false otherwise.
 */
const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto.createHmac('sha256', config.razorpayWebhookSecret)
                                  .update(body.toString()) // Ensure body is a string
                                  .digest('hex');

  // Compare the received signature with the calculated signature
  return expectedSignature === signature;
};

/**
 * Initializes Razorpay instance.
 * @returns {object} - Razorpay instance.
 */
const Razorpay = require('razorpay');
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  });
};

module.exports = {
  verifyWebhookSignature,
  getRazorpayInstance
};