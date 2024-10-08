import { createServer } from "http";
import express from "express";
import managementApiRouter from "./Routes/management.route.js";
import { reverseProxyApp } from "./Services/reverseProxy.service.js";
import { MANAGEMENT_API_PORT, REVERSE_PROXY_PORT } from "./Config/index.js";
import { logError } from "./Utils/index.js";
import {
  initializeDockerEventListener,
  initializeExistingContainers,
} from "./Services/docker.service.js";
import dotenv from "dotenv";
import { connectToDatabase, closeDbConnection } from "./Config/db.js";

dotenv.config();

const startServer = async () => {
  try {
    // Connect to the database
    await connectToDatabase();

    // Initialize Docker event listener
    // await initializeExistingContainers();
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
      reverseProxyServer.close(() =>
        console.log("Reverse Proxy server closed")
      );
      managementServer.close(() => console.log("Management API server closed"));
      closeDbConnection();
    });
  } catch (error) {
    logError("Failed to start the server", error);
    process.exit(1);
  }
};

startServer();
