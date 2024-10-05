import Docker from "dockerode";
import { DOCKER_SOCKET_PATH } from "../Config/index.js";
import { logError } from "../Utils/index.js";

export const docker = new Docker({ socketPath: DOCKER_SOCKET_PATH });

// In-memory database for container info
export const db = new Map();

export const registerContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();
    const containerName = containerInfo.Name.substring(1);
    const ipAddress = containerInfo.NetworkSettings.IPAddress;
    const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts);

    let defaultPort = null;
    if (exposedPorts && exposedPorts.length > 0) {
      const [port, type] = exposedPorts[0].split("/");
      if (type === "tcp") {
        defaultPort = parseInt(port);
      }
    }

    console.log(
      `Registering http://${containerName}.localhost --> http://${ipAddress}:${defaultPort}`
    );
    db.set(containerName, { containerName, ipAddress, defaultPort });
  } catch (error) {
    logError(`Error registering container ${containerId}`, error);
  }
};

export const initializeDockerEventListener = () => {
  docker.getEvents((err, stream) => {
    if (err) {
      logError("Error getting Docker events", err);
      return;
    }

    stream.on("data", async (chunk) => {
      try {
        if (!chunk) return;
        const event = JSON.parse(chunk.toString());

        if (event.Type === "container" && event.Action === "start") {
          await registerContainer(event.id);
        }
        console.log(`Received event: ${event.Type} -> ${event.Action}`);
      } catch (error) {
        logError("Error processing Docker event", error);
      }
    });
  });
};
