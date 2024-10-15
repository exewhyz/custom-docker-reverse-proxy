import { createServer } from "http";
import express from "express";
import dotenv from "dotenv";
import managementApiRouter from "./Routes/management.route.js";
import { reverseProxyApp } from "./Services/reverseProxy.service.js";
import { logError } from "./Utils/index.js";

import {
  initializeDockerEventListener,
  initializeExistingContainers,
  startStoppedRemovedContainers,
} from "./Services/docker.service.js";

import { MANAGEMENT_API_PORT, REVERSE_PROXY_PORT } from "./Config/index.js";

import { connectToDatabase, closeDbConnection } from "./Config/db.js";

dotenv.config();

// Connect to the database
await connectToDatabase();

// Initialize Docker event listener
initializeDockerEventListener();

// Initialize Docker event listener
initializeExistingContainers();

// Start any stopped or removed containers from the database
startStoppedRemovedContainers();

const managementApiApp = express();

// Use JSON middleware for request bodies
managementApiApp.use(express.json());

// Root route for Management Server
managementApiApp.get("/", (_, res) => {
  res.status(200).json({ success: true, message: "Healthy" });
});

// Mount Management API routes
managementApiApp.use("/api/management", managementApiRouter);

// Create http server instance for management api app
const managementServer = createServer(managementApiApp);

// Start Management API server
managementServer.listen(MANAGEMENT_API_PORT, (err) => {
  if (err) {
    logError("Error starting Management API", err);
  } else {
    console.log(
      `Management API is running at http://localhost:${MANAGEMENT_API_PORT}`
    );
  }
});

// Create http server instance for reverse proxy app
const reverseProxyServer = createServer(reverseProxyApp);

// Start listening for connections on the reverse proxy server
reverseProxyServer.listen(REVERSE_PROXY_PORT, (err) => {
  if (err) {
    logError("Error starting Reverse Proxy", err);
  } else {
    console.log(
      `Reverse Proxy is running at http://localhost:${REVERSE_PROXY_PORT}`
    );
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP servers");
  reverseProxyServer.close(() => console.log("Reverse Proxy server closed"));
  managementServer.close(() => console.log("Management API server closed"));
  closeDbConnection();
  process.exit(0);
});
