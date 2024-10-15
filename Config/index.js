import dotenv from "dotenv";

dotenv.config();

// <<<<<<<---------------------------------------------------------------->>>>>>>

// Define environment variables for the application
export const MANAGEMENT_API_PORT = process.env.MANAGEMENT_API_PORT || 8080;

export const REVERSE_PROXY_PORT = process.env.REVERSE_PROXY_PORT || 80;

// <<<<<<<---------------------------------------------------------------->>>>>>>

export const REVERSE_PROXY_SERVER_NAME =
  process.env.REVERSE_PROXY_SERVER_NAME || "reverse-proxy-server";

export const DB_SERVER_NETWORK_NAME =
  process.env.DB_SERVER_NETWORK_NAME || "db-net";

export const PROXY_SERVER_NETWORK_NAME =
  process.env.PROXY_SERVER_NETWORK_NAME || "proxy-net";

export const PROXIED_SERVER_NETWORK_NAME =
  process.env.PROXIED_SERVER_NETWORK_NAME || "proxied-net";

// <<<<<<<---------------------------------------------------------------->>>>>>>

export const DOCKER_SOCKET_PATH =
  process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";

// const SSL = process.env.SSL || false;

// const PRODUCTION = process.env.NODE_ENV === "production";

// export const SECURE = PRODUCTION && SSL === "true";

// export const PROTOCOL = SECURE ? "https" : "http";

// export const SSL_CERT_PATH =
//   process.env.SSL_CERT_PATH ||
//   "/etc/letsencrypt/live/yourdomain.com/fullchain.pem";

// export const SSL_KEY_PATH =
//   process.env.SSL_KEY_PATH ||
//   "/etc/letsencrypt/live/yourdomain.com/privkey.pem";

// export const DOMAIN = PRODUCTION
//   ? process.env.DOMAIN || "localhost"
//   : "localhost";

// <<<<<<<---------------------------------------------------------------->>>>>>>

const MONGODB_HOST = process.env.MONGODB_HOST || "mongodb";
const MONGODB_INTERNAL_PORT = process.env.MONGODB_INTERNAL_PORT || "27017";
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || "docker-reverse-proxy";
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let MONGODB_URI;

if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_INTERNAL_PORT}/${MONGODB_DATABASE}?authSource=admin`;
} else {
  MONGODB_URI = `mongodb://${MONGODB_HOST}:${MONGODB_INTERNAL_PORT}/${MONGODB_DATABASE}?authSource=admin`;
}

export const MONGO_URI = process.env.MONGO_URI || MONGODB_URI;

// <<<<<<<---------------------------------------------------------------->>>>>>>
