// src/controllers/loansController.js
const Loan = require('../models/loan');
const path = require('path');
const fs = require('fs');
const getDriverModel = require('../models/driverModel');

const submitLoanApplication = async (req, res) => {
  console.log('submitLoanApplication called');
  const { requestedAmount, purpose, tenureMonths } = req.body;
  const driverId = req.user._id;

  if (!requestedAmount || !purpose || !tenureMonths) {
    return res.status(400).json({ message: 'Please fill all required loan application fields.' });
  }

  try {
    // Get driver model from user database
    const Driver = getDriverModel();
    
    // Fetch driver details directly from database
    const driver = await Driver.findById(driverId);
    console.log('Fetched driver from database:', driver);

    if (!driver || (driver.role !== 'driver' && driver.role !== 'admin')) {
      return res.status(403).json({ message: 'Only registered drivers or admins can apply for loans.' });
    }

    const driverSnapshot = {
      name: driver.name,
      email: driver.email,
      mobileNumber: driver.mobileNumber,
      // You can expand this with more fields if needed
      driverDetails: {
        ridesCompleted: driver.driverDetails?.ridesCompleted || 0,
        averageRating: driver.driverDetails?.averageRating || 0,
        cancellationRate: driver.driverDetails?.cancellationRate || 0,
      },
    };

    // Process uploaded files and store their paths
    const kycDocuments = {};
    if (req.files && req.files.governmentAddressProofImage) {
      kycDocuments.governmentAddressProofImage = {
        filename: req.files.governmentAddressProofImage[0].filename,
        path: `/uploads/address_proofs/${req.files.governmentAddressProofImage[0].filename}`,
      };
    }
    if (req.files && req.files.selfieImage) {
      kycDocuments.selfieImage = {
        filename: req.files.selfieImage[0].filename,
        path: `/uploads/selfies/${req.files.selfieImage[0].filename}`,
      };
    }
    if (req.files && req.files.bankStatements) {
      kycDocuments.bankStatements = req.files.bankStatements.map((file) => ({
        filename: file.filename,
        path: `/uploads/bank_statements/${file.filename}`,
      }));
    }

    const loan = new Loan({
      driverId,
      driverSnapshot,
      requestedAmount,
      purpose,
      tenureMonths,
      kycDocuments,
      status: 'pending',
      eligibilityStatus: 'pending',
    });

    // --- CIBIL Score Integration Placeholder ---
    try {
      const simulatedCibilScore = Math.floor(Math.random() * (900 - 300 + 1)) + 300;
      loan.cibilScore = simulatedCibilScore;
      loan.cibilStatus = 'fetched';

      if (simulatedCibilScore >= 700 && driverSnapshot.driverDetails.ridesCompleted >= 100) {
        loan.eligibilityStatus = 'eligible';
        loan.eligibilityReason = 'Meets CIBIL and ride completion criteria.';
      } else {
        loan.eligibilityStatus = 'not_eligible';
        loan.eligibilityReason = 'Does not meet minimum CIBIL score or ride completion criteria.';
      }
    } catch (cibilError) {
      loan.cibilStatus = 'error';
      loan.eligibilityStatus = 'not_eligible';
      loan.eligibilityReason = 'CIBIL check failed.';
    }

    await loan.save();

    res.status(201).json({
      message: 'Loan application submitted successfully.',
      loan,
    });
  } catch (error) {
    console.error('Error in submitLoanApplication:', error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: 'Authentication failed when fetching driver details from user management service.' 
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Driver not found in user-management-service.' });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ message: 'Access denied when fetching driver details.' });
    }
    
    res.status(500).json({ message: 'Server error during loan application submission.' });
  }
};

const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find({}).sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching loan applications.' });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found.' });
    }

    if (req.user.role === 'borrower' && loan.driverId !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to view this loan application.' });
    }

    res.json(loan);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid loan ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching loan application.' });
  }
};

const updateLoanStatus = async (req, res) => {
  const { status, rejectionReason } = req.body;
  const loanId = req.params.id;

  try {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan application not found.' });
    }

    loan.status = status;
    loan.updatedAt = Date.now();

    if (status === 'approved') {
      loan.approvedBy = req.user._id;
      loan.approvedDate = Date.now();
      const annualInterestRate = 0.12;
      const monthlyInterestRate = annualInterestRate / 12;
      const totalInterest = loan.requestedAmount * annualInterestRate * (loan.tenureMonths / 12);
      loan.totalRepayableAmount = loan.requestedAmount + totalInterest;
      loan.dailyRepaymentAmount = loan.totalRepayableAmount / (loan.tenureMonths * 30);
      loan.outstandingAmount = loan.totalRepayableAmount;
      loan.repaymentStartDate = new Date();
      loan.repaymentEndDate = new Date(loan.repaymentStartDate);
      loan.repaymentEndDate.setMonth(loan.repaymentEndDate.getMonth() + loan.tenureMonths);
      loan.nextPaymentDueDate = new Date(loan.repaymentStartDate);
    } else if (status === 'rejected') {
      loan.rejectionReason = rejectionReason;
    } else if (status === 'disbursed') {
      loan.disbursementDate = Date.now();
      loan.disbursedAmount = loan.requestedAmount;
    }

    await loan.save();

    res.json({
      message: `Loan application status updated to ${status}.`,
      loan,
    });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid loan ID format.' });
    }
    res.status(500).json({ message: 'Server error updating loan status.' });
  }
};

module.exports = {
  submitLoanApplication,
  getAllLoans,
  getLoanById,
  updateLoanStatus,
};
