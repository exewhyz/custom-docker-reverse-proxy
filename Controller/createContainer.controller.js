import { docker } from "../Services/docker.service.js";
import { logError } from "../Utils/index.js";
import { EventEmitter } from "events";

// In-memory database for container status event info
const containerStatuses = new Map();

const containerEvents = new EventEmitter();

export const createContainer = async (req, res) => {
  const { image, tag = "latest", customContainerName = null } = req.body;
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

  processContainerCreation(customContainerName, img, requestId);
};

export const containerStatus = (req, res) => {
  const { requestId } = req.params;

  if (containerStatuses.has(requestId)) {
    res.json(containerStatuses.get(requestId));
  } else {
    res.status(404).json({ error: "No status found for this request ID" });
  }
};

async function processContainerCreation(customContainerName, img, requestId) {
  try {
    const images = await docker.listImages();
    const imageExists = images.some(
      (systemImage) =>
        systemImage.RepoTags && systemImage.RepoTags.includes(img)
    );

    if (!imageExists) {
      console.log(`Pulling Image ${img}`);
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
        updateStatus(requestId, {
          status: "error",
          message: `Failed to pull image ${img}`,
          error: pullError.message,
        });
        return;
      }
    }

    updateStatus(requestId, {
      status: "creating",
      message: `Creating container with image ${img}`,
    });
    let container = null;
    if (customContainerName) {
      container = await docker.createContainer({
        Image: img,
        name: customContainerName,
        Tty: false,
        HostConfig: {
          AutoRemove: true,
        },
      });
    } else {
      container = await docker.createContainer({
        Image: img,
        Tty: false,
        HostConfig: {
          AutoRemove: true,
        },
      });
    }
    if (container) {
      const containerInfo = await container.inspect();
      const containerName = containerInfo.Name.startsWith("/")
        ? containerInfo.Name.substring(1)
        : containerInfo.Name;

      await container.start();

      console.log(`${containerName} started on ${containerName}.localhost`);

      updateStatus(requestId, {
        status: "running",
        message: `Container ${containerName} started on http://${containerName}.localhost`,
        containerId: container.id,
        containerName: containerName,
      });
    }
  } catch (error) {
    logError("Error creating container", error);
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
