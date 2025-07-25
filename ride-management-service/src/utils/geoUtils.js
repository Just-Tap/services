// services/ride-management-service/src/utils/geoUtils.js
// This file provides utilities for geospatial calculations using Google Maps API.
const axios = require('axios');
const config = require('../config');

const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey;

/**
 * Calculates distance and duration between two points using Google Maps Distance Matrix API.
 * @param {Array<number>} origin - [longitude, latitude] of the origin.
 * @param {Array<number>} destination - [longitude, latitude] of the destination.
 * @returns {Object} - Contains distance in km and duration in minutes.
 */
const getDistanceAndDuration = async (origin, destination) => {
  const originStr = `${origin[1]},${origin[0]}`; // Google Maps API expects latitude,longitude
  const destinationStr = `${destination[1]},${destination[0]}`;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 'OK' && data.rows.length > 0 && data.rows[0].elements.length > 0) {
      const element = data.rows[0].elements[0];
      if (element.status === 'OK') {
        const distanceMeters = element.distance.value; // Distance in meters
        const durationSeconds = element.duration.value; // Duration in seconds

        return {
          distanceKm: distanceMeters / 1000, // Convert to kilometers
          durationMinutes: durationSeconds / 60 // Convert to minutes
        };
      } else {
        console.error('Google Maps API Element Status Error:', element.status, element.fare);
        throw new Error(`Google Maps API Element Status Error: ${element.status}`);
      }
    } else {
      console.error('Google Maps API Response Error:', data.status, data.error_message);
      throw new Error(`Google Maps API Response Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error fetching distance and duration from Google Maps API:', error.message);
    throw new Error('Failed to get distance and duration from mapping service.');
  }
};

/**
 * Calculates the estimated fare based on distance and configuration.
 * @param {number} distanceKm - Distance in kilometers.
 * @returns {number} - Estimated fare.
 */
const calculateEstimatedFare = (distanceKm) => {
  const { baseFarePerKm, minimumFare } = config;
  let fare = distanceKm * baseFarePerKm;
  return Math.max(fare, minimumFare); // Ensure fare is at least the minimum fare
};

module.exports = {
  getDistanceAndDuration,
  calculateEstimatedFare
};