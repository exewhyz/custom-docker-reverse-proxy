// import Docker from "dockerode";
// import { DOCKER_SOCKET_PATH } from "../Config/index.js";
// import { logError } from "../Utils/index.js";
// import { Container } from "../Models/Container.model.js";

// export const docker = new Docker({ socketPath: DOCKER_SOCKET_PATH });

// // In-memory database for container info
// // export const db = new Map();

// export const registerContainer = async (containerId) => {
//   try {
//     const container = docker.getContainer(containerId);
//     const containerInfo = await container.inspect();
//     const containerName = containerInfo.Name.substring(1);
//     const ipAddress = containerInfo.NetworkSettings.IPAddress;
//     const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts);

//     let defaultPort = null;
//     if (exposedPorts && exposedPorts.length > 0) {
//       const [port, type] = exposedPorts[0].split("/");
//       if (type === "tcp") {
//         defaultPort = parseInt(port);
//       }
//     }

//     console.log(
//       `Registering http://${containerName}.localhost --> http://${ipAddress}:${defaultPort}`
//     );
//     await Container.findOrCreate({
//       containerName,
//       ipAddress,
//       defaultPort,
//     });
//     // db.set(containerName, { containerName, ipAddress, defaultPort });
//   } catch (error) {
//     logError(`Error registering container ${containerId}`, error);
//   }
// };

// export const initializeDockerEventListener = () => {
//   docker.getEvents((err, stream) => {
//     if (err) {
//       logError("Error getting Docker events", err);
//       return;
//     }

//     stream.on("data", async (chunk) => {
//       try {
//         if (!chunk) return;
//         const event = JSON.parse(chunk.toString());

//         if (event.Type === "container" && event.Action === "start") {
//           await registerContainer(event.id);
//         }
//         console.log(`Received event: ${event.Type} -> ${event.Action}`);
//       } catch (error) {
//         logError("Error processing Docker event", error);
//       }
//     });
//   });
// };

import Docker from "dockerode";
import { DOCKER_SOCKET_PATH } from "../Config/index.js";
import { logError } from "../Utils/index.js";
import { Container } from "../Models/Container.model.js";

export const docker = new Docker({ socketPath: DOCKER_SOCKET_PATH });

export const getContainerIP = async (containerInfo) => {
  // Check bridge network first
  if (containerInfo.NetworkSettings.Networks.bridge) {
    console.log("bridge network IP address", containerInfo.NetworkSettings.Networks.bridge.IPAddress);
    return containerInfo.NetworkSettings.Networks.bridge.IPAddress;
  }

  // If not in bridge, check other networks
  const networks = Object.values(containerInfo.NetworkSettings.Networks);
  console.log(networks);
  if (networks.length > 0) {
    console.log("first network IP address", networks[0].IPAddress);
    return networks[0].IPAddress;
  }

  return null;
};

export const registerContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();

    const containerName = containerInfo.Name.substring(1);
    const ipAddress = await getContainerIP(containerInfo);

    if (!ipAddress) {
      console.log(`No IP address found for container ${containerName}`);
      return;
    }

    const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts || {});

    let defaultPort = null;
    if (exposedPorts && exposedPorts.length > 0) {
      const [port, type] = exposedPorts[0].split("/");
      if (type === "tcp") {
        defaultPort = parseInt(port);
      }
    }

    // If no exposed ports, try to get port from port bindings
    if (!defaultPort && containerInfo.NetworkSettings.Ports) {
      const portBindings = Object.keys(containerInfo.NetworkSettings.Ports);
      if (portBindings.length > 0) {
        const [port, type] = portBindings[0].split("/");
        if (type === "tcp") {
          defaultPort = parseInt(port);
        }
      }
    }

    if (!defaultPort) {
      console.log(`No default port found for container ${containerName}`);
      return;
    }

    console.log(
      `Registering http://${containerName}.localhost --> http://${ipAddress}:${defaultPort}`
    );

    await Container.findOneAndUpdate(
      { containerName },
      {
        containerName,
        ipAddress,
        defaultPort,
      },
      { upsert: true, new: true }
    );
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

        if (event.Type === "container") {
          switch (event.Action) {
            case "start":
              await registerContainer(event.id);
              break;
            case "die":
            case "stop":
              // Remove container from database when it stops
              const container = docker.getContainer(event.id);
              const containerInfo = await container.inspect();
              const containerName = containerInfo.Name.substring(1);
              await Container.findOneAndDelete({ containerName });
              console.log(`Removed container ${containerName} from database`);
              break;
          }
        }
        console.log(`Processed event: ${event.Type} -> ${event.Action}`);
      } catch (error) {
        logError("Error processing Docker event", error);
      }
    });
  });
};

// Function to initialize existing containers
export const initializeExistingContainers = async () => {
  try {
    const containers = await docker.listContainers();
    for (const containerInfo of containers) {
      await registerContainer(containerInfo.Id);
    }
    console.log("Initialized existing containers");
  } catch (error) {
    logError("Error initializing existing containers", error);
  }
};
