import { createServer } from "http";
import express from "express";
import managementApiRouter from "./Routes/management.route.js";
import { reverseProxyApp } from "./Services/reverseProxy.service.js";
import { MANAGEMENT_API_PORT, REVERSE_PROXY_PORT } from "./Config/index.js";
import { logError } from "./Utils/index.js";
import { initializeDockerEventListener } from "./Services/docker.service.js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Docker event listener
initializeDockerEventListener();

const managementApiApp = express();

// Use JSON middleware for request bodies
managementApiApp.use(express.json());

// Root route for Management Server
managementApiApp.get("/", (_, res) => {
  res.status(200).json({ success: true, message: "Healthy" });
});

// Mount Management API routes
managementApiApp.use("/api/management", managementApiRouter);

// Start Management API server
const managementServer = createServer(managementApiApp);

managementServer.listen(MANAGEMENT_API_PORT, (err) => {
  if (err) {
    logError("Error starting Management API", err);
  } else {
    console.log(
      `Management API is running at http://localhost:${MANAGEMENT_API_PORT}`
    );
  }
});

// Start Reverse Proxy server
const reverseProxyServer = createServer(reverseProxyApp);
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
});
