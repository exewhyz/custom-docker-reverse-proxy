import dotenv from "dotenv";

dotenv.config();

// Define environment variables for the application
export const MANAGEMENT_API_PORT = process.env.MANAGEMENT_API_PORT || 8080;
export const REVERSE_PROXY_PORT = process.env.REVERSE_PROXY_PORT || 80;
export const DOCKER_SOCKET_PATH =
  process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";

const SSL = process.env.SSL || false;

export const PROTOCOL =
  process.env.NODE_ENV === "production" && SSL ? "https" : "http";

export const DOMAIN =
  process.env.NODE_ENV === "production"
    ? process.env.DOMAIN || "localhost"
    : "localhost";

const MONGODB_HOST = process.env.MONGODB_HOST || "mongodb";
const MONGODB_PORT = process.env.MONGODB_PORT || "27017";
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || "docker-reverse-proxy";
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let MONGODB_URI;

if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=admin`;
} else {
  MONGODB_URI = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=admin`;
}

export const MONGO_URI = process.env.MONGO_URI || MONGODB_URI;
