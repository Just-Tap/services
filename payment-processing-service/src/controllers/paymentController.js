// services/payment-processing-service/src/controllers/paymentController.js
// This file contains the business logic for payment operations and Razorpay integration.
const Payment = require('../models/Payment');
const { getRazorpayInstance, verifyWebhookSignature } = require('../utils/razorpayUtils');
const { sendPaymentEvent } = require('../events/paymentProducer');
const config = require('../config');

// Initialize Razorpay instance
const razorpay = getRazorpayInstance();

/**
 * @desc    Initiate a payment by creating a Razorpay Order.
 * This endpoint is called by the frontend when a customer is about to pay.
 * @route   POST /api/v1/payments/initiate
 * @access  Private (Customer)
 */
const initiatePayment = async (req, res) => {
  try {
    const { rideId, amount, currency, description, paymentMethodType, customerId } = req.body;

    // Find the internal payment record (created by Kafka consumer)
    let paymentRecord = await Payment.findOne({ rideId, customerId, status: 'initiated' });

    // If no existing 'initiated' payment record, create one.
    // This handles cases where the Kafka event might be delayed or missed,
    // or if payment is initiated for something other than a ride.
    if (!paymentRecord) {
      paymentRecord = new Payment({
        rideId,
        customerId,
        amount,
        currency,
        description,
        paymentMethodType, // Use the method type from request for this new record
        status: 'initiated'
      });
      await paymentRecord.save();
      console.log(`New payment record created on initiate: ${paymentRecord._id}`);
    } else {
        // Update payment method type if it was 'not_selected'
        if (paymentRecord.paymentMethodType === 'not_selected' && paymentMethodType) {
            paymentRecord.paymentMethodType = paymentMethodType;
            await paymentRecord.save();
        }
    }

    // Create a Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount, // Amount in smallest currency unit (e.g., paise)
      currency: currency,
      receipt: `receipt_ride_${rideId || paymentRecord._id}`, // Unique receipt ID
      notes: {
        paymentId: paymentRecord._id.toString(), // Link to our internal payment ID
        customerId: customerId.toString(),
        rideId: rideId ? rideId.toString() : 'N/A',
        description: description
      }
    });

    // Update our internal payment record with Razorpay Order ID
    paymentRecord.razorpayOrderId = razorpayOrder.id;
    paymentRecord.status = 'pending'; // Status changes to pending once Razorpay order is created
    await paymentRecord.save();

    // Send back the Razorpay Order details to the frontend
    res.status(200).json({
      message: 'Razorpay Order created successfully',
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: config.razorpayKeyId, // Send Key ID to frontend for Checkout
      paymentId: paymentRecord._id // Our internal payment ID
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.message });
  }
};

/**
 * @desc    Verify a payment after it's completed on the Razorpay Checkout.
 * This endpoint is called by the frontend after successful payment.
 * @route   POST /api/v1/payments/verify
 * @access  Private (Customer)
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

    // Retrieve the internal payment record
    const paymentRecord = await Payment.findById(paymentId);

    if (!paymentRecord) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    // Ensure the Razorpay Order ID matches
    if (paymentRecord.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Mismatched Razorpay Order ID.' });
    }

    // Construct the string to be signed: order_id + '|' + payment_id
    const generatedSignature = crypto.createHmac('sha256', config.razorpayKeySecret)
                                     .update(razorpay_order_id + '|' + razorpay_payment_id)
                                     .digest('hex');

    // Verify the signature
    if (generatedSignature === razorpay_signature) {
      // Payment is successful and verified
      paymentRecord.razorpayPaymentId = razorpay_payment_id;
      paymentRecord.razorpaySignature = razorpay_signature;
      paymentRecord.status = 'captured'; // Mark as captured
      await paymentRecord.save();

      // Send Kafka event for successful payment
      sendPaymentEvent('payment_processed', {
        paymentId: paymentRecord._id,
        rideId: paymentRecord.rideId,
        customerId: paymentRecord.customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'success',
        razorpayPaymentId: razorpay_payment_id,
        paymentMethodType: paymentRecord.paymentMethodType,
        message: 'Payment successfully captured and verified.'
      }, paymentRecord._id.toString());

      res.status(200).json({
        message: 'Payment verified successfully',
        paymentStatus: 'success',
        paymentId: paymentRecord._id
      });
    } else {
      // Signature mismatch indicates tampering or invalid payment
      paymentRecord.status = 'failed';
      paymentRecord.failureReason = 'Signature verification failed';
      await paymentRecord.save();

      sendPaymentEvent('payment_processed', {
        paymentId: paymentRecord._id,
        rideId: paymentRecord.rideId,
        customerId: paymentRecord.customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'failed',
        razorpayPaymentId: razorpay_payment_id,
        paymentMethodType: paymentRecord.paymentMethodType,
        message: 'Payment verification failed due to signature mismatch.'
      }, paymentRecord._id.toString());

      res.status(400).json({ message: 'Payment verification failed: Invalid signature.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
};

/**
 * @desc    Handle Razorpay Webhook notifications.
 * This endpoint is called by Razorpay directly.
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Razorpay) - Secured by signature verification
 */
const handleWebhook = async (req, res) => {
  // Razorpay sends the signature in the 'x-razorpay-signature' header
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody; // Make sure express.raw() is used in app.js for this endpoint

  if (!signature || !rawBody) {
    console.error('Webhook: Missing signature or raw body');
    return res.status(400).json({ message: 'Missing webhook signature or body' });
  }

  // Verify the webhook signature
  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.error('Webhook: Invalid signature');
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  // Signature is valid, process the event
  const event = req.body; // Parsed JSON body
  console.log('Received valid Razorpay webhook event:', event.event, 'Payload:', event.payload);

  try {
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCapturedWebhook(event.payload.payment);
        break;
      case 'payment.failed':
        await handlePaymentFailedWebhook(event.payload.payment);
        break;
      case 'refund.processed':
        await handleRefundProcessedWebhook(event.payload.refund);
        break;
      case 'order.paid':
        await handleOrderPaidWebhook(event.payload.order);
        break;
      default:
        console.warn(`Unhandled Razorpay webhook event type: ${event.event}`);
    }
    // Always respond with 200 OK to acknowledge receipt of the webhook
    res.status(200).send('Webhook received and processed');
  } catch (error) {
    console.error('Error processing Razorpay webhook event:', error);
    // Respond with 500 to signal to Razorpay to retry the webhook
    res.status(500).send('Error processing webhook');
  }
};

/**
 * Internal handler for 'payment.captured' webhook event.
 * @param {object} paymentPayload - The payment object from Razorpay webhook.
 */
const handlePaymentCapturedWebhook = async (paymentPayload) => {
  const { id: razorpayPaymentId, order_id: razorpayOrderId, status, notes } = paymentPayload;
  const paymentId = notes ? notes.paymentId : null; // Our internal payment ID from notes

  if (!paymentId) {
    console.error(`payment.captured webhook: Missing internal paymentId in notes for Razorpay Payment ID: ${razorpayPaymentId}`);
    return;
  }

  try {
    const paymentRecord = await Payment.findById(paymentId);

    if (!paymentRecord) {
      console.error(`payment.captured webhook: Internal payment record not found for ID: ${paymentId}`);
      return;
    }

    // Update status only if it's not already captured or refunded
    if (paymentRecord.status !== 'captured' && paymentRecord.status !== 'refunded') {
      paymentRecord.status = 'captured';
      paymentRecord.razorpayPaymentId = razorpayPaymentId;
      // Note: signature is not directly available in webhook payload for 'payment.captured'
      // It's verified during the client-side `verifyPayment` call.
      await paymentRecord.save();
      console.log(`Payment record ${paymentId} updated to captured via webhook.`);

      // Send Kafka event for successful payment
      sendPaymentEvent('payment_processed', {
        paymentId: paymentRecord._id,
        rideId: paymentRecord.rideId,
        customerId: paymentRecord.customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'success',
        razorpayPaymentId: razorpayPaymentId,
        paymentMethodType: paymentRecord.paymentMethodType,
        message: 'Payment successfully captured via webhook.'
      }, paymentRecord._id.toString());
    } else {
      console.log(`Payment record ${paymentId} already in ${paymentRecord.status} status. No update needed.`);
    }
  } catch (error) {
    console.error(`Error handling payment.captured webhook for ${razorpayPaymentId}:`, error);
  }
};

/**
 * Internal handler for 'payment.failed' webhook event.
 * @param {object} paymentPayload - The payment object from Razorpay webhook.
 */
const handlePaymentFailedWebhook = async (paymentPayload) => {
  const { id: razorpayPaymentId, order_id: razorpayOrderId, status, error, notes } = paymentPayload;
  const paymentId = notes ? notes.paymentId : null;

  if (!paymentId) {
    console.error(`payment.failed webhook: Missing internal paymentId in notes for Razorpay Payment ID: ${razorpayPaymentId}`);
    return;
  }

  try {
    const paymentRecord = await Payment.findById(paymentId);

    if (!paymentRecord) {
      console.error(`payment.failed webhook: Internal payment record not found for ID: ${paymentId}`);
      return;
    }

    // Update status only if it's not already captured or refunded
    if (paymentRecord.status !== 'captured' && paymentRecord.status !== 'refunded') {
      paymentRecord.status = 'failed';
      paymentRecord.razorpayPaymentId = razorpayPaymentId;
      paymentRecord.failureReason = error ? error.description : 'Unknown failure';
      await paymentRecord.save();
      console.log(`Payment record ${paymentId} updated to failed via webhook.`);

      // Send Kafka event for failed payment
      sendPaymentEvent('payment_processed', {
        paymentId: paymentRecord._id,
        rideId: paymentRecord.rideId,
        customerId: paymentRecord.customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'failed',
        razorpayPaymentId: razorpayPaymentId,
        paymentMethodType: paymentRecord.paymentMethodType,
        message: `Payment failed via webhook: ${paymentRecord.failureReason}`
      }, paymentRecord._id.toString());
    } else {
      console.log(`Payment record ${paymentId} already in ${paymentRecord.status} status. No update needed for failure.`);
    }
  } catch (error) {
    console.error(`Error handling payment.failed webhook for ${razorpayPaymentId}:`, error);
  }
};

/**
 * Internal handler for 'refund.processed' webhook event.
 * @param {object} refundPayload - The refund object from Razorpay webhook.
 */
const handleRefundProcessedWebhook = async (refundPayload) => {
  const { id: razorpayRefundId, payment_id: razorpayPaymentId, status, amount, entity } = refundPayload;

  try {
    // Find the payment record associated with this refund
    const paymentRecord = await Payment.findOne({ razorpayPaymentId: razorpayPaymentId });

    if (!paymentRecord) {
      console.error(`refund.processed webhook: Payment record not found for Razorpay Payment ID: ${razorpayPaymentId}`);
      return;
    }

    // Update payment status to refunded/partially_refunded
    // Note: Razorpay doesn't send partial refund status explicitly in webhook,
    // you'd typically track this by comparing original amount with refunded amount.
    // For simplicity, we'll assume full refund if status is 'processed'.
    paymentRecord.status = 'refunded';
    paymentRecord.refundId = razorpayRefundId;
    await paymentRecord.save();
    console.log(`Payment record ${paymentRecord._id} updated to refunded via webhook.`);

    // Send Kafka event for refund processed
    sendPaymentEvent('refund_processed', {
      paymentId: paymentRecord._id,
      rideId: paymentRecord.rideId,
      customerId: paymentRecord.customerId,
      razorpayPaymentId: razorpayPaymentId,
      razorpayRefundId: razorpayRefundId,
      amount: amount, // Amount refunded
      currency: paymentRecord.currency,
      status: 'success',
      message: 'Refund successfully processed.'
    }, paymentRecord._id.toString());

  } catch (error) {
    console.error(`Error handling refund.processed webhook for ${razorpayRefundId}:`, error);
  }
};

/**
 * Internal handler for 'order.paid' webhook event.
 * @param {object} orderPayload - The order object from Razorpay webhook.
 */
const handleOrderPaidWebhook = async (orderPayload) => {
  const { id: razorpayOrderId, status, amount, currency, notes } = orderPayload;
  const paymentId = notes ? notes.paymentId : null;

  if (!paymentId) {
    console.error(`order.paid webhook: Missing internal paymentId in notes for Razorpay Order ID: ${razorpayOrderId}`);
    return;
  }

  try {
    const paymentRecord = await Payment.findById(paymentId);

    if (!paymentRecord) {
      console.error(`order.paid webhook: Internal payment record not found for ID: ${paymentId}`);
      return;
    }

    // If the order is paid and our internal payment is not yet captured/refunded,
    // it's a strong signal. We can update its status here.
    // Note: This might be redundant if payment.captured always fires reliably,
    // but it acts as a fallback or additional confirmation.
    if (status === 'paid' && paymentRecord.status !== 'captured' && paymentRecord.status !== 'refunded') {
      paymentRecord.status = 'captured'; // Mark as captured if order is paid
      // If razorpayPaymentId is not set yet (e.g., if payment.captured webhook was delayed),
      // we might try to fetch it or rely on the verifyPayment endpoint.
      await paymentRecord.save();
      console.log(`Payment record ${paymentId} updated to captured via order.paid webhook.`);

      // Optionally, send a Kafka event here if it's the first time we confirm success
      // (though payment.captured is usually preferred for definitive payment success)
      sendPaymentEvent('payment_processed', {
        paymentId: paymentRecord._id,
        rideId: paymentRecord.rideId,
        customerId: paymentRecord.customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: 'success',
        razorpayOrderId: razorpayOrderId,
        message: 'Order successfully paid via webhook.'
      }, paymentRecord._id.toString());

    } else {
      console.log(`Order ${razorpayOrderId} is in ${status} status, or payment ${paymentId} already processed. No update needed.`);
    }
  } catch (error) {
    console.error(`Error handling order.paid webhook for ${razorpayOrderId}:`, error);
  }
};


module.exports = {
  initiatePayment,
  verifyPayment,
  handleWebhook,
};