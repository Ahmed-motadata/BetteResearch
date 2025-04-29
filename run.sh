#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if X11 is running
if [ -z "$DISPLAY" ]; then
    echo "X11 display not found. Please make sure X11 is running."
    exit 1
fi

# Set up X11 permissions
xhost +local:docker || {
    echo "Failed to set X11 permissions. Please make sure xhost is installed."
    echo "On Ubuntu/Debian: sudo apt-get install x11-xserver-utils"
    exit 1
}

# Copy appropriate .env file
cp -f .env.docker .env

# Build and start Docker containers
echo "Starting BetteResearch application..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
sleep 5

# Start the application
docker-compose up app

# Clean up
echo "Cleaning up X11 permissions..."
xhost -local:docker