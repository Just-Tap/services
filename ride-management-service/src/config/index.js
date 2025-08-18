// This file centralizes the configuration for the Ride Management Service.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3002,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  kafkaBroker: process.env.KAFKA_BROKER,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  // NEW: Define fare configuration per vehicle type
  vehicleFareConfig: {
    car: {
      baseFarePerKm: parseFloat(process.env.CAR_BASE_FARE_PER_KM || '12'), // Example: Car is 12 INR/km
      minimumFare: parseFloat(process.env.CAR_MINIMUM_FARE || '60')     // Example: Car min is 60 INR
    },
    moto: {
      baseFarePerKm: parseFloat(process.env.MOTO_BASE_FARE_PER_KM || '8'), // Example: Moto is 8 INR/km
      minimumFare: parseFloat(process.env.MOTO_MINIMUM_FARE || '40')     // Example: Moto min is 40 INR
    },
    auto: {
      baseFarePerKm: parseFloat(process.env.AUTO_BASE_FARE_PER_KM || '10'), // Example: Auto is 10 INR/km
      minimumFare: parseFloat(process.env.AUTO_MINIMUM_FARE || '50')     // Example: Auto min is 50 INR
    }
  }
};