Ride Management Service
This service is responsible for the core ride lifecycle within the JustTap application, including handling ride requests, matching customers with drivers, tracking ride status, and managing real-time driver locations.

Features
Ride Request: Customers can request rides specifying pickup, dropoff, and vehicle type.

Driver Matching: Logic to find nearby available drivers based on location and vehicle type.

Ride Status Management: Tracks the full lifecycle of a ride (e.g., pending, searching, accepted, driver_arrived, started, completed, cancelled).

Real-time Driver Location Tracking: Drivers can update their live location, stored in a geospatial-indexed collection.

Fare & Time Estimation: Calculates estimated fare and travel time using Google Maps Distance Matrix API.

Ride Actions: Drivers can accept, reject, start, arrive at pickup, and end rides. Customers can cancel rides.

Ride History: Retrieves past rides for both customers and drivers.

Kafka Integration:

Consumes events: Reacts to user_registered (to onboard drivers for location tracking), driver_location_updated (from driver apps/other services), payment_processed (to mark rides as completed after payment).

Produces events: Publishes ride_request_new, ride_status_update, ride_completed_for_payment, ride_request_rejected_by_driver to inform other services.

Socket.IO (WebSockets): (Planned for real-time updates to customer/driver apps, though core logic is currently via Kafka events and HTTP API).

Technologies Used
Node.js / Express.js: Backend framework.

MongoDB / Mongoose: Database for ride data and driver locations.

Kafka / kafka-node: Asynchronous event streaming for inter-service communication.

JWT: For secure authentication and authorization.

Axios: HTTP client for external API calls (e.g., Google Maps).

Google Maps Distance Matrix API: For distance and duration calculations.

Socket.IO: For real-time, bidirectional communication (e.g., driver location updates to customers).

express-validator: For input validation.

CORS: For Cross-Origin Resource Sharing.

dotenv: For environment variable management.

Nodemon: For development auto-restarts.

Setup Instructions
Prerequisites
Node.js (LTS version recommended) and npm installed.

Docker and Docker Compose installed and running (for MongoDB and Kafka).

A Google Maps API Key with Distance Matrix API enabled.

1. Clone the Repository (if you haven't already)
git clone <your-repo-url>
cd JustTap/services/ride-management-service

2. Environment Variables
Create a .env file in the ride-management-service/ directory based on .env.example:

PORT=3002
MONGO_URI=mongodb://localhost:27017/ride_db
JWT_SECRET=your_super_secret_jwt_key_for_ride_service_replace_this
KAFKA_BROKER=localhost:9092
GOOGLE_MAPS_API_KEY=AIZASYDRMDCH-MCHYS0ohxCENn4v2NBcw1t2b8 # Your actual Google Maps API Key
BASE_FARE_PER_KM=10
MINIMUM_FARE=50

MONGO_URI: Ensure this matches your MongoDB container's accessible URI.

JWT_SECRET: A strong, random string for JWT signing (can be different from User Service).

KAFKA_BROKER: The address of your Kafka broker (usually localhost:9092).

GOOGLE_MAPS_API_KEY: Your actual Google Maps API Key with Distance Matrix API enabled.

BASE_FARE_PER_KM: Base fare in INR per kilometer.

MINIMUM_FARE: Minimum fare for any ride in INR.

3. Install Dependencies
npm install

4. Start Dependent Services (MongoDB & Kafka)
Navigate to your infrastructure/ directory and start the Docker containers:

cd ../infrastructure # From ride-management-service/
docker compose up -d

Important: Wait for Kafka to fully initialize (1-2 minutes).

Create Kafka Topics: This service consumes from and produces to several topics. You MUST manually create these topics in Kafka if auto-creation is not enabled, otherwise, you will get TopicsNotExistError.

driver_location_updated

payment_processed

ride_request_new

ride_status_update

ride_completed_for_payment

ride_request_rejected_by_driver

You can create them by running docker exec -it kafka bash and then:

kafka-topics --create --topic driver_location_updated --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
kafka-topics --create --topic payment_processed --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
kafka-topics --create --topic ride_request_new --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
kafka-topics --create --topic ride_status_update --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
kafka-topics --create --topic ride_completed_for_payment --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
kafka-topics --create --topic ride_request_rejected_by_driver --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

5. Run the Service
# From ride-management-service/
npm.cmd run dev # Use npm.cmd if you face PowerShell execution policy issues

The service will start on http://localhost:3002.

API Endpoints
All endpoints are prefixed with /api/v1.

POST /api/v1/rides/request: Customer requests a new ride. (Protected: Customer)

PUT /api/v1/rides/drivers/location: Driver updates their current location. (Protected: Driver)

POST /api/v1/rides/:rideId/accept: Driver accepts a ride request. (Protected: Driver)

POST /api/v1/rides/:rideId/reject: Driver rejects a ride request. (Protected: Driver)

POST /api/v1/rides/:rideId/arrived: Driver marks arrival at pickup. (Protected: Driver)

POST /api/v1/rides/:rideId/start: Driver starts the ride. (Protected: Driver)

POST /api/v1/rides/:rideId/end: Driver ends the ride. (Protected: Driver)

POST /api/v1/rides/:rideId/cancel: Customer or Driver cancels a ride. (Protected: Customer, Driver)

GET /api/v1/rides/active: Get current active ride for user. (Protected: Customer, Driver)

GET /api/v1/rides/history: Get ride history for user. (Protected: Customer, Driver)

GET /api/v1/rides/:rideId: Get specific ride details. (Protected: Customer, Driver, Admin)

Refer to the source code in src/routes/rideRoutes.js and src/controllers/rideController.js for full details.