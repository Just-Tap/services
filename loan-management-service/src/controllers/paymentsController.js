// src/controllers/paymentsController.js
const Payment = require('../models/payment');
const Loan = require('../models/loan');

const recordPayment = async (req, res) => {
  const { amount, transactionId, paymentMethod } = req.body;
  const loanId = req.params.loanId;
  const payerId = req.user._id;

  try {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    if (!['disbursed', 'ongoing'].includes(loan.status)) {
      return res.status(400).json({ message: 'Payments can only be recorded for disbursed or ongoing loans.' });
    }

    if (req.user.role === 'borrower' && loan.driverId !== payerId) {
      return res.status(403).json({ message: 'Not authorized to record payment for this loan.' });
    }

    if (!amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ message: 'Please provide valid amount and payment method.' });
    }

    const payment = new Payment({
      loan: loanId,
      driverId: loan.driverId,
      amount,
      transactionId: transactionId || `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      paymentMethod,
    });

    await payment.save();

    loan.outstandingAmount -= amount;
    loan.lastPaymentDate = Date.now();

    if (loan.outstandingAmount <= 0) {
      loan.status = 'completed';
      loan.outstandingAmount = 0;
    } else {
      loan.status = 'ongoing';
    }

    await loan.save();

    res.status(201).json({
      message: 'Payment recorded successfully.',
      payment,
      loanOutstanding: loan.outstandingAmount,
      loanStatus: loan.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error recording payment.' });
  }
};

const getPaymentsByLoanId = async (req, res) => {
  const loanId = req.params.loanId;

  try {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    if (req.user.role === 'borrower' && loan.driverId !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to view payments for this loan.' });
    }

    const payments = await Payment.find({ loan: loanId }).sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid loan ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching payments.' });
  }
};

module.exports = {
  recordPayment,
  getPaymentsByLoanId,
};
