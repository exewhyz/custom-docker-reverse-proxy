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
//       `Registering http://${containerName}.localhost:${REVERSE_PROXY_PORT} --> http://${ipAddress}:${defaultPort}`
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
import {
  DOCKER_SOCKET_PATH,
  PROXIED_SERVER_NETWORK_NAME,
  REVERSE_PROXY_PORT,
  REVERSE_PROXY_SERVER_NAME,
} from "../Config/index.js";
import { logError } from "../Utils/index.js";
import { Container } from "../Models/Container.model.js";
import { processContainerCreation } from "../Controller/container.controller.js";

export const docker = new Docker({ socketPath: DOCKER_SOCKET_PATH });

export const getContainerIP = async (containerInfo) => {
  // Check bridge network first
  if (containerInfo.NetworkSettings.Networks.bridge) {
    return containerInfo.NetworkSettings.Networks.bridge.IPAddress;
  }

  // If not in bridge, check other networks
  const networks = Object.values(containerInfo.NetworkSettings.Networks);

  if (networks.length > 0) {
    return networks[0].IPAddress;
  }

  return null;
};

export const registerContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    if (!container) {
      return null;
    }
    const containerInfo = await container.inspect();

    const containerName = containerInfo.Name.substring(1);
    const imageUsed = containerInfo.Config.Image;
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
      `Registering http://${containerName}.localhost:${REVERSE_PROXY_PORT} --> http://${ipAddress}:${defaultPort}`
    );

    await Container.findOneAndUpdate(
      { containerName },
      {
        containerId,
        containerName,
        imageUsed,
        ipAddress,
        defaultPort,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    logError(`Error registering container ${containerId}`, error);
    throw error;
  }
};

export async function validateContainer(subDomain) {
  try {
    // First, check the database
    const container = await Container.findOne({
      containerName: subDomain,
    });

    if (!container) {
      return null;
    }

    const { containerId, containerName, imageUsed } = container;

    const containerData = docker.getContainer(containerId);
    // Try to get container info from Docker
    try {
      const containerInfo = await containerData.inspect();

      //! If container exists in both DB and Docker but not in running state
      if (containerInfo && !containerInfo.State.Running) {
        try {
          // start the container
          console.log(`Starting Stopped Container: ${containerName}`);
          await containerData.start();

          console.log(
            `Container ${containerName} started successfully on http://${containerName}.localhost:${REVERSE_PROXY_PORT}/`
          );

          try {
            // return the updated container from the database
            return await Container.findOne({ containerName });
          } catch (error) {
            logError(
              `Error while returning updated stopped Container(${containerInfo.Name})`,
              error
            );
            return null;
          }
        } catch (error) {
          logError(`Error while Starting Stopped Container ${containerName}`);
          return null;
        }
      }

      //! If container exists in both DB and Docker and is in running state
      return container;
    } catch (dockerError) {
      //! If container does not exist in Docker but exists in DB
      if (dockerError.statusCode === 404) {
        console.log(
          `No Container(${containerName}) found and Creating Container(${containerName})`
        );
        try {
          try {
            await processContainerCreation(containerName, imageUsed);
            console.log(`Container(${containerName}) started`);
            try {
              return await Container.findOne({ containerName });
            } catch (error) {
              logError(
                `Error while returning updated stopped Container(${containerName}) inside valition function`,
                error
              );
              return null;
            }
          } catch (error) {
            logError(
              `Error during creating the removed Container(${containerName} inside validating function`,
              error
            );
            return null;
          }
        } catch (error) {
          logError(
            `Error during creating the removed Container(${containerName}`,
            error
          );
          return null;
        }
      } else {
        logError(
          `Error while inspecting Container(${containerName})`,
          dockerError
        );
        return null;
      }
    }
  } catch (error) {
    console.error("Error validating container:", error);
    return null;
  }
}

export function startStoppedRemovedContainers() {
  console.log("Starting Stopped or Removed Containers...");
  Container.find({})
    .then((containers) => {
      for (const container of containers) {
        const { containerId, containerName, imageUsed } = container;
        const containerData = docker.getContainer(containerId);
        containerData
          .inspect()
          .then((containerInfo) => {
            if (containerInfo && !containerInfo.State.Running) {
              // start the container
              console.log(containerData);
              console.log(`Starting the stopped Container(${containerName})`);
              containerData
                .start()
                .then(() => {
                  console.log(`Container(${containerName}) started`);
                })
            }
          })
          .catch(async (error) => {
            if (error.statusCode === 404) {
              // create that container
              console.log(
                `No Container(${containerName}) found and Creating Container(${containerName})`
              );
              try {
                await processContainerCreation(containerName, imageUsed);
                console.log(`Container(${containerName}) started`);
              } catch (error) {
                logError(
                  `Error during creating the removed Container(${containerName} inside stopstart function`,
                  error
                );
              }
            } else {
              logError(
                `Error while inspecting Container(${containerName})`,
                error
              );
            }
          });
      }
      console.log("Starting Stopped or Removed Containers Completed");
    })
    .catch((error) => {
      logError("Error during Starting -->  Stopped/Removed Container", error);
    });
}

export const initializeDockerEventListener = () => {
  console.log("Initializing Docker Event Listener...");
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
            default:
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
export const initializeExistingContainers = () => {
  console.log("Initializing existing containers to DB...");
  const networks = docker.getNetwork(PROXIED_SERVER_NETWORK_NAME);
  networks
    .inspect()
    .then((networkInfo) => {
      const containers = networkInfo.Containers;
      for (const [containerId, containerInfo] of Object.entries(containers)) {
        if (containerInfo.Name !== REVERSE_PROXY_SERVER_NAME) {
          console.log(`Initializing Container(${containerInfo.Name}) into DB`);
          registerContainer(containerId)
            .then(() => {
              console.log(
                `Container(${containerInfo.Name}) registered into DB`
              );
            })
            .catch((error) => {
              throw new Error(
                `Error while registering Container(${containerInfo.Name}) to DB`,
                error
              );
            });
        }
      }
      console.log("Initialized existing Containers Completed");
    })
    .catch((error) => {
      logError(
        `Error during initializing existing containers into DB --> NetWork(${PROXIED_SERVER_NETWORK_NAME}) not Found`,
        error
      );
    });
};
