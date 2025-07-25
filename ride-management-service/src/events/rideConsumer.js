// Kafka consumer for ride-related events.
// This service might consume events from other services (e.g., user_registered, driver_location_updated)
// to react to changes or update its internal state.
const kafka = require('kafka-node');
const client = require('./kafkaClient');
const DriverLocation = require('../models/DriverLocation'); // To update driver locations
const Ride = require('../models/Ride'); // To update ride status based on other service events

const Consumer = kafka.Consumer;

// Define topics this consumer should listen to
const topics = [
  { topic: 'user_registered', partition: 0 }, // Example: To add new drivers to location tracking
  { topic: 'driver_location_updated', partition: 0 }, // From Driver Location Service (if separate) or Mobile App
  { topic: 'payment_processed', partition: 0 }, // From Payment Service for ride completion
  // Add other relevant topics here
];

const consumer = new Consumer(
  client,
  topics,
  {
    groupId: 'ride-management-group', // Consumer group ID
    autoCommit: true
  }
);

consumer.on('message', async (message) => {
  console.log(`Kafka Ride Consumer received message from topic ${message.topic}:`);
  try {
    const event = JSON.parse(message.value);
    console.log('Event:', event);

    switch (message.topic) {
      case 'user_registered':
        // If a new driver registers, consider adding them to DriverLocation collection
        // This is a simplified example; in production, you might have a dedicated Driver Location Service
        if (event.role === 'driver') {
          // Check if driver already has a location entry (e.g., if they logged in before)
          const existingLocation = await DriverLocation.findOne({ driverId: event.userId });
          if (!existingLocation) {
            // For simplicity, assign a dummy initial location and vehicle type for new drivers
            // In a real app, drivers would set their initial location and availability
            await DriverLocation.create({
              driverId: event.userId,
              location: {
                type: 'Point',
                coordinates: [0, 0] // Default to [longitude, latitude]
              },
              isAvailable: true,
              vehicleType: event.vehicleType || 'car' // Assuming vehicleType might come from user_registered
            });
            console.log(`New driver ${event.userId} added to DriverLocation.`);
          }
        }
        break;

      case 'driver_location_updated':
        // Update driver's real-time location and availability
        await DriverLocation.findOneAndUpdate(
          { driverId: event.driverId },
          {
            location: {
              type: 'Point',
              coordinates: event.coordinates // [longitude, latitude]
            },
            isAvailable: event.isAvailable,
            lastUpdated: Date.now()
          },
          { upsert: true, new: true } // Create if not exists, return updated doc
        );
        // This event could also trigger logic to notify nearby customers if a ride is pending
        console.log(`Driver ${event.driverId} location updated.`);
        break;

      case 'payment_processed':
        // When payment for a ride is processed, update ride status to completed
        if (event.transactionType === 'ride_payment' && event.status === 'success') {
          await Ride.findByIdAndUpdate(event.rideId, { status: 'completed' });
          console.log(`Ride ${event.rideId} marked as completed after payment.`);
        }
        break;

      default:
        console.log(`Unhandled Kafka topic: ${message.topic}`);
    }
  } catch (e) {
    console.error('Error parsing or processing Kafka message in Ride Consumer:', e, message.value);
  }
});

consumer.on('error', (err) => {
  console.error('Kafka Ride Consumer error:', err);
});

consumer.on('offsetOutOfRange', (err) => {
  console.error('Kafka Ride Consumer offsetOutOfRange:', err);
});

module.exports = consumer;