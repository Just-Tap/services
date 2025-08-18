// services/ride-management-service/src/controllers/rideController.js
// This file contains controller functions for managing ride lifecycle.
const Ride = require('../models/Ride');
const DriverLocation = require('../models/DriverLocation');
const { getDistanceAndDuration, calculateEstimatedFare } = require('../utils/geoUtils');
const { sendRideEvent } = require('../events/rideProducer');
const mongoose = require('mongoose'); // Import mongoose to use ObjectId for queries

// In-memory map to store pending ride requests and assigned drivers
// In a production system, this would be a more robust solution like Redis or a dedicated matching service.
const pendingRideRequests = new Map(); // Map: rideId -> { rideObject, potentialDrivers: [driverId, ...], timeout }

// Function to find nearby drivers (simplified for demonstration)
// In a real system, this would be more sophisticated (e.g., using geospatial queries with filtering)
const findNearbyDrivers = async (pickupCoordinates, requestedVehicleType) => {
  // Find available drivers of the requested vehicle type within a certain radius
  // For demonstration, let's assume a 50km radius
  const radiusKm = 50; // Search radius in kilometers

  const nearbyDrivers = await DriverLocation.find({
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: pickupCoordinates // [longitude, latitude]
        },
        $maxDistance: radiusKm * 1000 // Convert km to meters
      }
    },
    isAvailable: true,
    vehicleType: requestedVehicleType
  }).populate('driverId'); // Populate driver details if needed (e.g., name, mobile)

  // Filter out drivers who are already on a ride or not truly available
  // (This requires a 'currentRideId' field on DriverLocation or similar logic)
  // For now, we assume isAvailable: true is sufficient.

  return nearbyDrivers.map(d => ({
    driverId: d.driverId._id, // Assuming driverId is populated with actual driver document
    currentLocation: d.location.coordinates,
    vehicleType: d.vehicleType
  }));
};


// @desc    Request a new ride
// @route   POST /api/v1/rides/request
// @access  Private (Customer)
const requestRide = async (req, res) => {
  const { pickupLocation, dropoffLocation, requestedVehicleType } = req.body;
  const customerId = req.user._id; // From auth middleware

  try {
    // 1. Check for existing pending/active rides for the customer
    const existingRide = await Ride.findOne({
      customerId,
      status: { $in: ['pending', 'searching', 'accepted', 'driver_arrived', 'started'] }
    });

    if (existingRide) {
      return res.status(409).json({ message: 'You already have an active or pending ride.', rideId: existingRide._id });
    }

    // 2. Calculate estimated fare and time
    const { distanceKm, durationMinutes } = await getDistanceAndDuration(
      pickupLocation.coordinates,
      dropoffLocation.coordinates
    );
    // Pass requestedVehicleType to calculateEstimatedFare
    const estimatedFare = calculateEstimatedFare(distanceKm, requestedVehicleType);

    // 3. Create new ride request in DB
    const newRide = await Ride.create({
      customerId,
      pickupLocation: {
        type: 'Point',
        coordinates: pickupLocation.coordinates,
        address: pickupLocation.address
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: dropoffLocation.coordinates,
        address: dropoffLocation.address
      },
      requestedVehicleType,
      status: 'searching', // Initial status
      estimatedFare,
      estimatedTimeMinutes: durationMinutes,
      distanceKm // Store this for later reference, actual will be calculated on completion
    });

    // 4. Find nearby available drivers
    const nearbyDrivers = await findNearbyDrivers(pickupLocation.coordinates, requestedVehicleType);

    if (nearbyDrivers.length === 0) {
      // No drivers found, update ride status and notify customer
      newRide.status = 'no_drivers_found';
      await newRide.save();
      sendRideEvent('ride_status_update', {
        rideId: newRide._id,
        customerId,
        status: 'no_drivers_found',
        message: 'No drivers found nearby for your request.'
      }, customerId.toString());
      return res.status(404).json({ message: 'No drivers found nearby for your request at the moment.' });
    }

    // 5. Store pending ride request for driver matching logic
    // In a real system, this would involve a queue or a more complex matching algorithm
    pendingRideRequests.set(newRide._id.toString(), {
      ride: newRide,
      potentialDrivers: nearbyDrivers.map(d => d.driverId.toString()), // Store only IDs
      currentDriverIndex: 0,
      timeout: setTimeout(async () => {
        // Handle timeout if no driver accepts
        const timedOutRide = await Ride.findById(newRide._id);
        if (timedOutRide && timedOutRide.status === 'searching') {
          timedOutRide.status = 'no_drivers_found';
          await timedOutRide.save();
          sendRideEvent('ride_status_update', {
            rideId: timedOutRide._id,
            customerId: timedOutRide.customerId,
            status: 'no_drivers_found',
            message: 'Ride request timed out. No drivers accepted.'
          }, timedOutRide.customerId.toString());
          console.log(`Ride ${timedOutRide._id} timed out: no drivers accepted.`);
        }
        pendingRideRequests.delete(newRide._id.toString());
      }, 60 * 1000) // 60 seconds to find a driver
    });

    // 6. Notify the first few potential drivers (via WebSocket or Kafka)
    // This is where real-time driver apps would receive a notification
    for (let i = 0; i < Math.min(nearbyDrivers.length, 3); i++) { // Notify up to 3 drivers
      const driver = nearbyDrivers[i];
      sendRideEvent('ride_request_new', {
        rideId: newRide._id,
        customerId,
        pickupLocation: newRide.pickupLocation,
        dropoffLocation: newRide.dropoffLocation,
        estimatedFare: newRide.estimatedFare,
        estimatedTimeMinutes: newRide.estimatedTimeMinutes,
        requestedVehicleType: newRide.requestedVehicleType
      }, driver.driverId.toString()); // Use driverId as key for specific driver notification
      console.log(`Notified driver ${driver.driverId} about new ride request ${newRide._id}`);
    }

    res.status(202).json({
      message: 'Ride requested successfully. Searching for drivers...',
      rideId: newRide._id,
      status: newRide.status,
      estimatedFare: newRide.estimatedFare,
      estimatedTimeMinutes: newRide.estimatedTimeMinutes
    });

  } catch (error) {
    console.error('Error requesting ride:', error);
    res.status(500).json({ message: 'Server error during ride request.' });
  }
};

// @desc    Driver accepts a ride
// @route   POST /api/v1/rides/:rideId/accept
// @access  Private (Driver)
const acceptRide = async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user._id; // From auth middleware

  try {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride request not found.' });
    }

    // Check if the ride is still in 'searching' status
    if (ride.status !== 'searching') {
      return res.status(409).json({ message: `Ride is no longer available or already ${ride.status}.` });
    }

    // Check if the driver is available
    const driverLocation = await DriverLocation.findOne({ driverId, isAvailable: true });
    if (!driverLocation) {
      return res.status(403).json({ message: 'You are not available to accept rides.' });
    }

    // Assign driver to ride and update status
    ride.driverId = driverId;
    ride.status = 'accepted';
    await ride.save();

    // Clear timeout for pending request
    const pendingRequest = pendingRideRequests.get(rideId);
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      pendingRideRequests.delete(rideId);
    }

    // Update driver's availability (e.g., set to false or 'on_ride')
    driverLocation.isAvailable = false;
    await driverLocation.save();

    // Notify customer that their ride has been accepted
    sendRideEvent('ride_status_update', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: driverId,
      status: 'accepted',
      message: 'Your ride has been accepted by a driver!',
      driverLocation: driverLocation.location.coordinates // Send driver's current location
    }, ride.customerId.toString());

    // Notify other potential drivers that the ride is no longer available (optional, but good practice)
    // This would involve iterating through pendingRideRequests.get(rideId).potentialDrivers and sending a 'ride_cancelled_for_driver' event

    res.status(200).json({
      message: 'Ride accepted successfully.',
      rideId: ride._id,
      status: ride.status,
      driverId: ride.driverId
    });

  } catch (error) {
    console.error('Error accepting ride:', error);
    res.status(500).json({ message: 'Server error during ride acceptance.' });
  }
};

// @desc    Driver rejects a ride (or customer cancels)
// @route   POST /api/v1/rides/:rideId/reject
// @access  Private (Driver)
// Note: This endpoint is for a driver explicitly rejecting. Customer cancellation uses a different endpoint.
const rejectRide = async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user._id;

  try {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride request not found.' });
    }

    // Only allow rejection if ride is still searching and assigned to this driver (if applicable)
    // Or if it's a general rejection of a new request
    if (ride.status !== 'searching' && ride.driverId && ride.driverId.toString() !== driverId.toString()) {
      return res.status(403).json({ message: 'You cannot reject this ride.' });
    }

    const pendingRequest = pendingRideRequests.get(rideId);

    if (pendingRequest) {
      // Find the driver in the potential drivers list and remove them
      const driverIndex = pendingRequest.potentialDrivers.indexOf(driverId.toString());
      if (driverIndex > -1) {
        pendingRequest.potentialDrivers.splice(driverIndex, 1);
      }

      // If there are still other potential drivers, try to assign to next one
      if (pendingRequest.potentialDrivers.length > 0) {
        // In a more complex system, you'd re-queue or re-match
        // For simplicity here, we just let the timeout handle it if no one accepts
        console.log(`Driver ${driverId} rejected ride ${rideId}. Still ${pendingRequest.potentialDrivers.length} potential drivers.`);
        sendRideEvent('ride_request_rejected_by_driver', {
          rideId: ride._id,
          driverId: driverId,
          customerId: ride.customerId
        }, driverId.toString()); // Notify driver of their rejection status
        return res.status(200).json({ message: 'Ride rejected. Searching for other drivers.' });
      } else {
        // No more drivers left in the current search pool
        clearTimeout(pendingRequest.timeout);
        pendingRideRequests.delete(rideId);
        ride.status = 'no_drivers_found';
        await ride.save();
        sendRideEvent('ride_status_update', {
          rideId: ride._id,
          customerId: ride.customerId,
          status: 'no_drivers_found',
          message: 'No drivers found nearby for your request.'
        }, ride.customerId.toString());
        return res.status(200).json({ message: 'Ride rejected. No other drivers available.' });
      }
    } else {
      // If not in pending requests, it might be an already accepted/started ride,
      // or a request that timed out. Driver can't reject a non-searching ride this way.
      return res.status(409).json({ message: 'Ride is not in a state to be rejected by driver.' });
    }

  } catch (error) {
    console.error('Error rejecting ride:', error);
    res.status(500).json({ message: 'Server error during ride rejection.' });
  }
};


// @desc    Driver starts a ride
// @route   POST /api/v1/rides/:rideId/start
// @access  Private (Driver)
const startRide = async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user._id;

  try {
    const ride = await Ride.findOne({ _id: rideId, driverId });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not assigned to you.' });
    }

    if (ride.status !== 'accepted' && ride.status !== 'driver_arrived') {
      return res.status(409).json({ message: `Ride cannot be started from status: ${ride.status}.` });
    }

    ride.status = 'started';
    ride.rideStartTime = new Date();
    await ride.save();

    sendRideEvent('ride_status_update', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: driverId,
      status: 'started',
      message: 'Your ride has started!'
    }, ride.customerId.toString());

    res.status(200).json({ message: 'Ride started successfully.', rideId: ride._id, status: ride.status });

  } catch (error) {
    console.error('Error starting ride:', error);
    res.status(500).json({ message: 'Server error during ride start.' });
  }
};

// @desc    Driver ends a ride
// @route   POST /api/v1/rides/:rideId/end
// @access  Private (Driver)
const endRide = async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user._id;
  const { dropoffCoordinates, dropoffAddress } = req.body; // Driver's actual dropoff location

  try {
    const ride = await Ride.findOne({ _id: rideId, driverId });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not assigned to you.' });
    }

    if (ride.status !== 'started') {
      return res.status(409).json({ message: `Ride cannot be ended from status: ${ride.status}.` });
    }

    ride.status = 'completed';
    ride.rideEndTime = new Date();

    // Calculate actual distance and final fare based on actual dropoff
    const { distanceKm: actualDistanceKm } = await getDistanceAndDuration(
      ride.pickupLocation.coordinates,
      dropoffCoordinates || ride.dropoffLocation.coordinates // Use actual if provided, else estimated
    );
    // Pass the actual ride's requestedVehicleType to calculateEstimatedFare
    const finalFare = calculateEstimatedFare(actualDistanceKm, ride.requestedVehicleType);

    ride.distanceKm = actualDistanceKm;
    ride.fare = finalFare;
    ride.dropoffLocation.coordinates = dropoffCoordinates || ride.dropoffLocation.coordinates;
    ride.dropoffLocation.address = dropoffAddress || ride.dropoffLocation.address;

    await ride.save();

    // Update driver's availability back to true
    await DriverLocation.findOneAndUpdate(
      { driverId },
      { isAvailable: true }
    );

    // Notify Payment Processing Service to collect fare
    sendRideEvent('ride_completed_for_payment', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: driverId,
      amount: finalFare,
      currency: 'INR', // Assuming INR
      paymentMethod: 'app_wallet' // Or 'cash' - depends on your payment flow
    }, ride._id.toString()); // Use rideId as key for payment processing

    // Notify customer that ride is completed and fare
    sendRideEvent('ride_status_update', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: driverId,
      status: 'completed',
      fare: finalFare,
      distanceKm: actualDistanceKm,
      message: 'Your ride has ended. Fare collected.'
    }, ride.customerId.toString());

    res.status(200).json({
      message: 'Ride ended successfully. Fare calculated.',
      rideId: ride._id,
      status: ride.status,
      fare: ride.fare,
      distanceKm: ride.distanceKm
    });

  } catch (error) {
    console.error('Error ending ride:', error);
    res.status(500).json({ message: 'Server error during ride end.' });
  }
};


// @desc    Customer cancels a ride
// @route   POST /api/v1/rides/:rideId/cancel
// @access  Private (Customer or Driver)
const cancelRide = async (req, res) => {
  const { rideId } = req.params;
  const { cancellationReason } = req.body;
  const userId = req.user._id; // Customer or Driver ID
  const userRole = req.user.role;

  try {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    // Determine who is cancelling and if they are authorized
    let newStatus;
    if (userRole === 'customer' && ride.customerId.toString() === userId.toString()) {
      // Customer can cancel if ride is pending, searching, accepted, or driver_arrived
      if (['pending', 'searching', 'accepted', 'driver_arrived'].includes(ride.status)) {
        newStatus = 'cancelled_by_customer';
      } else {
        return res.status(409).json({ message: `Cannot cancel ride in ${ride.status} status.` });
      }
    } else if (userRole === 'driver' && ride.driverId && ride.driverId.toString() === userId.toString()) {
      // Driver can cancel if ride is accepted or driver_arrived
      if (['accepted', 'driver_arrived'].includes(ride.status)) {
        newStatus = 'cancelled_by_driver';
      } else {
        return res.status(409).json({ message: `Cannot cancel ride in ${ride.status} status.` });
      }
    } else {
      return res.status(403).json({ message: 'You are not authorized to cancel this ride.' });
    }

    ride.status = newStatus;
    ride.cancellationReason = cancellationReason;
    await ride.save();

    // If driver was assigned, make them available again
    if (ride.driverId && newStatus === 'cancelled_by_customer') {
      await DriverLocation.findOneAndUpdate(
        { driverId: ride.driverId },
        { isAvailable: true }
      );
    }
    // If driver cancelled, they should already be available or will be set by their app

    // Notify relevant parties via Kafka
    sendRideEvent('ride_status_update', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: ride.driverId, // May be null if cancelled before assignment
      status: newStatus,
      cancellationReason: cancellationReason,
      cancelledBy: userRole,
      message: `Ride ${rideId} was cancelled by ${userRole}.`
    }, ride.customerId.toString()); // Notify customer

    if (ride.driverId) { // Also notify driver if assigned
      sendRideEvent('ride_status_update', {
        rideId: ride._id,
        customerId: ride.customerId,
        driverId: ride.driverId,
        status: newStatus,
        cancellationReason: cancellationReason,
        cancelledBy: userRole,
        message: `Ride ${rideId} was cancelled by ${userRole}.`
      }, ride.driverId.toString());
    }


    res.status(200).json({ message: 'Ride cancelled successfully.', rideId: ride._id, status: newStatus });

  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({ message: 'Server error during ride cancellation.' });
  }
};


// @desc    Get ride details by ID
// @route   GET /api/v1/rides/:rideId
// @access  Private (Customer or Driver for their own ride, Admin for any)
const getRideById = async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found.' });
    }

    // Authorization check
    if (userRole === 'admin' ||
        (userRole === 'customer' && ride.customerId.toString() === userId.toString()) ||
        (userRole === 'driver' && ride.driverId && ride.driverId.toString() === userId.toString())) {
      res.status(200).json(ride);
    } else {
      res.status(403).json({ message: 'You are not authorized to view this ride.' });
    }

  } catch (error) {
    console.error('Error getting ride by ID:', error);
    res.status(500).json({ message: 'Server error fetching ride details.' });
  }
};


// @desc    Get current active ride for a user
// @route   GET /api/v1/rides/active
// @access  Private (Customer or Driver)
const getActiveRide = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    let query = {
      status: { $in: ['pending', 'searching', 'accepted', 'driver_arrived', 'started'] }
    };

    if (userRole === 'customer') {
      query.customerId = userId;
    } else if (userRole === 'driver') {
      query.driverId = userId;
    } else {
      return res.status(403).json({ message: 'Only customers and drivers can check active rides.' });
    }

    const activeRide = await Ride.findOne(query);

    if (!activeRide) {
      return res.status(404).json({ message: 'No active ride found.' });
    }

    res.status(200).json(activeRide);

  } catch (error) {
    console.error('Error getting active ride:', error);
    res.status(500).json({ message: 'Server error fetching active ride.' });
  }
};

// @desc    Get ride history for a user
// @route   GET /api/v1/rides/history
// @access  Private (Customer or Driver)
const getRideHistory = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    let query = {
      status: { $in: ['completed', 'cancelled_by_customer', 'cancelled_by_driver', 'no_drivers_found'] }
    };

    if (userRole === 'customer') {
      query.customerId = userId;
    } else if (userRole === 'driver') {
      query.driverId = userId;
    } else {
      return res.status(403).json({ message: 'Only customers and drivers can view ride history.' });
    }

    const rideHistory = await Ride.find(query).sort({ createdAt: -1 }); // Sort by most recent

    res.status(200).json(rideHistory);

  } catch (error) {
    console.error('Error getting ride history:', error);
    res.status(500).json({ message: 'Server error fetching ride history.' });
  }
};


// @desc    Driver updates their current location
// @route   PUT /api/v1/drivers/location
// @access  Private (Driver)
const updateDriverLocation = async (req, res) => {
  const driverId = req.user._id;
  const { coordinates, isAvailable, vehicleType } = req.body; // coordinates: [longitude, latitude]

  try {
    const driverLocation = await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        location: {
          type: 'Point',
          coordinates: coordinates
        },
        isAvailable: typeof isAvailable !== 'undefined' ? isAvailable : true, // Default to true if not provided
        vehicleType: vehicleType || 'car', // Default to car if not provided
        lastUpdated: Date.now()
      },
      { upsert: true, new: true } // Create if not exists, return updated document
    );

    // Publish driver_location_updated event to Kafka
    sendRideEvent('driver_location_updated', {
      driverId: driverId,
      coordinates: coordinates,
      isAvailable: driverLocation.isAvailable,
      vehicleType: driverLocation.vehicleType
    }, driverId.toString());

    res.status(200).json({ message: 'Driver location updated successfully.', driverLocation });

  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ message: 'Server error updating driver location.' });
  }
};

// @desc    Driver marks themselves as arrived at pickup location
// @route   POST /api/v1/rides/:rideId/arrived
// @access  Private (Driver)
const driverArrived = async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user._id;

  try {
    const ride = await Ride.findOne({ _id: rideId, driverId });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not assigned to you.' });
    }

    if (ride.status !== 'accepted') {
      return res.status(409).json({ message: `Cannot mark arrived from status: ${ride.status}.` });
    }

    ride.status = 'driver_arrived';
    ride.driverArrivalTime = new Date();
    await ride.save();

    sendRideEvent('ride_status_update', {
      rideId: ride._id,
      customerId: ride.customerId,
      driverId: driverId,
      status: 'driver_arrived',
      message: 'Your driver has arrived at the pickup location!'
    }, ride.customerId.toString());

    res.status(200).json({ message: 'Driver arrived successfully.', rideId: ride._id, status: ride.status });

  } catch (error) {
    console.error('Error marking driver arrived:', error);
    res.status(500).json({ message: 'Server error marking driver arrived.' });
  }
};


module.exports = {
  requestRide,
  acceptRide,
  rejectRide,
  startRide,
  endRide,
  cancelRide,
  getRideById,
  getActiveRide,
  getRideHistory,
  updateDriverLocation,
  driverArrived
};