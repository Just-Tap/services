User Management Service
This service is a core component of the JustTap application, responsible for handling user authentication (drivers, customers, and admins) and managing their profiles, including document uploads for drivers.

Features
User Registration:

Customer registration (name, mobile, email, gender, DOB).

Driver registration (name, mobile, email, DOB, vehicle details, extensive document uploads like Aadhar, PAN, Driving License, Vehicle RC).

OTP-based Authentication: Secure login using One-Time Passwords sent to mobile numbers.

JWT Authorization: Generates JSON Web Tokens for authenticated users to access protected routes.

Profile Management: Users can view and update their profiles.

Admin Capabilities:

View all registered users (customers and drivers).

View detailed driver profiles and uploaded documents.

Update driver status (e.g., pending_approval, active, blocked) and document validity flags (e.g., isAadharValid).

Kafka Integration: Publishes user-related events (e.g., user_registered, user_profile_updated, driver_status_updated) to Kafka for inter-service communication.

Document Uploads: Integrates with Multer for handling multipart form data and simulates cloud storage uploads for driver documents.

Technologies Used
Node.js / Express.js: Backend framework.

MongoDB / Mongoose: Database for user data persistence.

Kafka / kafka-node: Asynchronous event streaming for inter-service communication.

JWT: For secure authentication and authorization.

OTP-Generator: For generating OTPs.

Multer: Middleware for handling multipart/form-data (file uploads).

express-validator: For input validation.

CORS: For Cross-Origin Resource Sharing.

dotenv: For environment variable management.

Nodemon: For development auto-restarts.

Setup Instructions
Prerequisites
Node.js (LTS version recommended) and npm installed.

Docker and Docker Compose installed and running (for MongoDB and Kafka).

1. Clone the Repository (if you haven't already)
git clone <your-repo-url>
cd JustTap/services/user-management-service

2. Environment Variables
Create a .env file in the user-management-service/ directory based on .env.example:

PORT=3001
MONGO_URI=mongodb://localhost:27017/user_db
JWT_SECRET=your_super_secret_jwt_key_replace_this
KAFKA_BROKER=localhost:9092
OTP_SECRET=your_otp_secret_key_replace_this_too
OTP_EXPIRY_MINUTES=5

MONGO_URI: Ensure this matches your MongoDB container's accessible URI.

JWT_SECRET: A strong, random string for JWT signing.

KAFKA_BROKER: The address of your Kafka broker (usually localhost:9092 if running Docker on host).

OTP_SECRET: A strong, random string for OTP hashing.

3. Install Dependencies
npm install

4. Start Dependent Services (MongoDB & Kafka)
Navigate to your infrastructure/ directory and start the Docker containers:

cd ../infrastructure # From user-management-service/
docker compose up -d

Important: Wait for Kafka to fully initialize (1-2 minutes).

Create Kafka Topics: If you encounter TopicsNotExistError, you might need to manually create topics. For the User Management Service, it primarily produces events, but if other services consume from it, those topics might need to exist. For now, ensure ride_request_new, ride_status_update, driver_location_updated, payment_processed, etc., are created.

5. Run the Service
# From user-management-service/
npm.cmd run dev # Use npm.cmd if you face PowerShell execution policy issues

The service will start on http://localhost:3001.

API Endpoints
All endpoints are prefixed with /api/v1.

POST /api/v1/auth/customers/register: Register a new customer.

POST /api/v1/auth/drivers/register: Register a new driver (requires multipart/form-data for documents).

POST /api/v1/auth/send-otp: Request OTP for login.

POST /api/v1/auth/verify-otp: Verify OTP and get JWT token.

GET /api/v1/users/profile: Get authenticated user's profile. (Protected)

PUT /api/v1/users/profile: Update authenticated user's profile. (Protected, supports multipart/form-data for profile picture/document updates)

GET /api/v1/admin/users: Get all users (Admin only).

GET /api/v1/admin/users/:id: Get a specific user by ID (Admin only).

PUT /api/v1/admin/drivers/:id/status: Update driver approval status and document validity (Admin only).

GET /api/v1/admin/drivers/:id/documents: Get driver's uploaded document details (Admin only).

Refer to the source code in src/routes/authRoutes.js and src/routes/userRoutes.js for full details.