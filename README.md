# Spotify Clone Backend API

## Overview

A robust, feature-rich RESTful API that powers a Spotify-like music streaming application. Built with Node.js, Express, and MongoDB, this backend service provides comprehensive functionality for music streaming, user management, playlists, artists, albums, and more.

## Features

- **User Authentication**: Secure user registration and authentication system with JWT
- **Music Management**: Complete CRUD operations for tracks, albums, artists, and playlists
- **Audio Processing**: Audio streaming, conversion, and metadata handling
- **Search Functionality**: Advanced search capabilities across all music entities
- **Redis Caching**: Optimized performance with Redis caching for queries and sessions
- **Rate Limiting**: API rate limiting to prevent abuse
- **Swagger Documentation**: Comprehensive API documentation with Swagger UI
- **Performance Monitoring**: Built-in monitoring endpoints for system health checks
- **Cloud Integration**: Cloudinary integration for media file storage
- **Containerization**: Docker support for easy deployment

## Tech Stack

- **Node.js & Express**: Backend framework
- **MongoDB**: Database for storing application data
- **Redis**: Caching and session management
- **JWT**: Authentication and authorization
- **Cloudinary**: Cloud storage for media files
- **Swagger**: API documentation
- **Docker**: Containerization
- **FFmpeg**: Audio processing
- **Winston**: Logging
- **Jest**: Testing framework

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- FFmpeg

### Setup

1. Clone the repository
```bash
git clone <repository-url>
cd spotify-clone-back
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
MONGO_URI=<your-mongodb-connection-string>
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_SECRET=<your-session-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
NODE_ENV=development
```

4. Start the server
```bash
npm start
```

The server will start on http://localhost:3001 by default.

## Docker Setup

1. Build and run with Docker Compose
```bash
docker-compose up --build
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

### Main Endpoints

- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Users**: `/api/users`
- **Artists**: `/api/artists`
- **Albums**: `/api/albums`
- **Tracks**: `/api/tracks`
- **Playlists**: `/api/playlists`
- **Search**: `/api/search`
- **Audio**: `/api/audio`
- **Lyrics**: `/api/lyrics`
- **Uploads**: `/api/upload`
- **Health**: `/health`
- **Monitoring**: `/monitor`

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Models**: Database schemas and validation
- **Controllers**: Business logic
- **Routes**: API endpoints
- **Middleware**: Request processing, authentication, caching
- **Services**: External service integrations
- **Utils**: Helper functions and utilities
- **Config**: Application configuration

## Performance Optimization

- Query caching with Redis
- Rate limiting to prevent abuse
- Efficient MongoDB queries with indexing
- Streaming audio processing

## Testing

Run tests with:
```bash
npm test
```

## License

ISC

## Contributors

- [Your Name/Team]

## Future Improvements

- WebSocket support for real-time features
- OAuth integration
- Enhanced recommendation system
- Advanced analytics 