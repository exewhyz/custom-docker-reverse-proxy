import { DOMAIN, PROTOCOL, REVERSE_PROXY_PORT } from "../Config/index.js";
import { docker } from "../Services/docker.service.js";
import { logError } from "../Utils/index.js";
import { EventEmitter } from "events";

// In-memory database for container status event info
const containerStatuses = new Map();

const containerEvents = new EventEmitter();

export const createContainer = async (req, res) => {
  const { name = null, image, tag = "latest" } = req.body;
  const img = `${image}:${tag}`;

  const requestId = Date.now().toString();

  containerStatuses.set(requestId, {
    status: "initializing",
    message: "Container creation process initiated",
  });

  res.status(202).json({
    message: `Container creation process started for ${img}`,
    requestId: requestId,
    statusEndpoint: `/containers/status/${requestId}`,
  });

  processContainerCreation(name, img, requestId);
};

export const deleteContainer = async (req, res) => {
  const { name } = req.body;

  const requestId = Date.now().toString();

  containerStatuses.set(requestId, {
    status: "initializing",
    message: "Container deletion process initiated",
  });

  res.status(202).json({
    message: `Container deletion process started for ${name}`,
    requestId: requestId,
    statusEndpoint: `/containers/status/${requestId}`,
  });

  processContainerDeletion(name, requestId);
};

export const containerStatus = (req, res) => {
  const { requestId } = req.params;

  if (containerStatuses.has(requestId)) {
    res.json(containerStatuses.get(requestId));
  } else {
    res.status(404).json({ error: "No status found for this request ID" });
  }
};

export async function processContainerDeletion(name, requestId) {
  try {
    const container = docker.getContainer(name);
    if (!container) {
      updateStatus(requestId, {
        status: "error",
        message: "Container not found",
      });
      return;
    }
    await container.remove({ force: true });
    console.log(`Container ${name} deleted successfully`);
    updateStatus(requestId, {
      status: "deleted",
      message: "Container deleted",
    });
  } catch (error) {
    logError(error, `Error deleting container ${name}`);
    updateStatus(requestId, {
      status: "error",
      message: `Error deleting container: ${error.message}`,
    });
  }
}

export async function processContainerCreation(
  customContainerName,
  img,
  requestId = null
) {
  const configWithoutName = {
    Image: img,
    Tty: false,
    HostConfig: {
      AutoRemove: true,
    },
    NetworkingConfig: {
      EndpointsConfig: {
        ["custom-docker-reverse-proxy_proxied-net"]: {},
      },
    },
  };
  try {
    const images = await docker.listImages();
    const imageExists = images.some(
      (systemImage) =>
        systemImage.RepoTags && systemImage.RepoTags.includes(img)
    );

    if (!imageExists) {
      console.log(`Pulling Image ${img}`);
      requestId &&
        updateStatus(requestId, {
          status: "pulling",
          message: `Pulling image ${img}`,
        });

      try {
        await new Promise((resolve, reject) => {
          docker.pull(img, (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err, output) =>
              err ? reject(err) : resolve(output)
            );
          });
        });
      } catch (pullError) {
        requestId &&
          updateStatus(requestId, {
            status: "error",
            message: `Failed to pull image ${img}`,
            error: pullError.message,
          });
        logError(`Error pulling image ${img}`, pullError);
        return;
      }
    }

    requestId &&
      updateStatus(requestId, {
        status: "creating",
        message: `Creating container with image ${img}`,
      });

    const containerConfig = customContainerName
      ? { ...configWithoutName, name: customContainerName }
      : configWithoutName;

    let container = null;
    try {
      container = await docker.createContainer(containerConfig);
    } catch (error) {
      if (error.statusCode === 409) {
        logError(
          `Container with name ${customContainerName} already exists`,
          error
        );
        container = docker.getContainer(customContainerName);
      }
    }

    if (container) {
      const containerInfo = await container.inspect();
      const containerName = containerInfo.Name.startsWith("/")
        ? containerInfo.Name.substring(1)
        : containerInfo.Name;

      if (!containerInfo.State.Running) {
        await container.start();
      }

      console.log(
        `${containerName} started on ${PROTOCOL}://${containerName}.${DOMAIN}:${REVERSE_PROXY_PORT}/`
      );

      requestId &&
        updateStatus(requestId, {
          status: "running",
          message: `Container ${containerName} started on ${PROTOCOL}://${containerName}.${DOMAIN}:${REVERSE_PROXY_PORT}/`,

          containerId: containerInfo.Id,
          containerName: containerName,
        });
    }
  } catch (error) {
    logError("Error creating container", error);
    requestId &&
      updateStatus(requestId, {
        status: "error",
        message: "Failed to create and start container",
        error: error.message,
      });
  }
}

function updateStatus(requestId, status) {
  containerStatuses.set(requestId, status);
  containerEvents.emit(requestId, status);
}
