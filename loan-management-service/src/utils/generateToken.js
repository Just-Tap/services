const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRE || '1h'; // Default to 1 hour if not specified
  
  // Validate expiresIn format
  if (!expiresIn || typeof expiresIn !== 'string') {
    throw new Error('JWT_EXPIRE must be a valid string format (e.g., "1h", "30d", "7 days")');
  }
  
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn,
  });
};

module.exports = generateToken;
