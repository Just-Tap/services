# services/user-management-service/Dockerfile

# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# to install dependencies first. This leverages Docker's layer caching.
COPY package.json ./

# Install app dependencies
# Use npm ci for clean installs in CI/CD environments
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
# This should match the PORT environment variable in your .env file (e.g., 3001)
EXPOSE 3001

# Define the command to run the application
# This uses the 'start' script defined in package.json
CMD [ "npm", "start" ]
