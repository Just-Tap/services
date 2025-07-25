require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3002,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  kafkaBroker: process.env.KAFKA_BROKER,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  baseFarePerKm: parseFloat(process.env.BASE_FARE_PER_KM || '10'), // Default to 10 INR/km
  minimumFare: parseFloat(process.env.MINIMUM_FARE || '50'), // Default to 50 INR
};