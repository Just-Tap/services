// db.js
const mongoose = require('mongoose');
require('dotenv').config();

// Create a separate connection for the user database
const userDB = mongoose.createConnection(process.env.MONGO_USER_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create a separate connection for the loan database
const loanDB = mongoose.createConnection(process.env.MONGO_LOAN_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Event listeners to confirm each connection is successful
userDB.on('connected', () => {
    console.log('✅ Connected to User Database');
});

userDB.on('error', (err) => {
    console.error('❌ Error connecting to User Database:', err);
    process.exit(1);
});

loanDB.on('connected', () => {
    console.log('✅ Connected to Loan Database');
});

loanDB.on('error', (err) => {
    console.error('❌ Error connecting to Loan Database:', err);
    process.exit(1);
});

// Export both connections so they can be used in your application
module.exports = { userDB, loanDB };
