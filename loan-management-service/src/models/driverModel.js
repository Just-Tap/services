// // Centralized Driver model getter to prevent OverwriteModelError
// const { userDB } = require('../config/db');
// const DriverSchema = require('../../../user-management-service/src/models/Driver');

// // Get or create the Driver model from the user database connection
// const getDriverModel = () => {
//     try {
//         // Try to get existing model
//         return userDB.model('Driver');
//     } catch (error) {
//         // Model doesn't exist yet, create it
//         return userDB.model('Driver', DriverSchema.schema);
//     }
// };

// module.exports = getDriverModel;

const { userDB } = require('../config/db');
const BaseDriverModel = require('../../../user-management-service/src/models/Driver'); // this is a model
const mongoose = require('mongoose');

// clone schema from the model
const ExtendedDriverSchema = new mongoose.Schema(
  { ...BaseDriverModel.schema.obj, 
    pin: { type: String }, 
    selfieUrl: { type: String } 
  },
  { timestamps: true }
);

// Use extended schema
const getDriverModel = () => {
  try {
    return userDB.model('Driver');
  } catch (error) {
    return userDB.model('Driver', ExtendedDriverSchema);
  }
};

module.exports = getDriverModel;
