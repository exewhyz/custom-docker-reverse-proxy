import express from "express";
import httpProxy from "http-proxy";
import { logError } from "../Utils/index.js";
import { validateContainer } from "./docker.service.js";
import { REVERSE_PROXY_PORT } from "../Config/index.js";

const proxy = httpProxy.createProxy({});

export const reverseProxyApp = express();

reverseProxyApp.use(async (req, res) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  try {
    const container = await validateContainer(subDomain);

    if (!container) {
      return res.status(404).send("Container not found");
    }

    const { ipAddress, defaultPort } = container;

    // const { ipAddress, defaultPort } = db.get(subDomain);
    const target = `http://${ipAddress}:${defaultPort}`;

    proxy.web(req, res, {
      target,
      changeOrigin: true,
      ws: true,
    });
    console.log(
      `Forwarding ${req.protocol}://${hostname}:${REVERSE_PROXY_PORT} --> ${target}`
    );
  } catch (error) {
    logError("Error while finding container inside reverse proxy", error);
    res.status(500).send("Error:", error.message);
  }
});

reverseProxyApp.on("upgrade", async (req, socket, head) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  try {
    const container = await validateContainer(subDomain);
    if (!container) {
      socket.destroy();
      return;
    }

    const { ipAddress, defaultPort } = container;

    const target = `http://${ipAddress}:${defaultPort}`;

    proxy.ws(req, socket, head, {
      target,
      ws: true,
    });
    console.log(
      `Forwarding ws://${hostname}:${REVERSE_PROXY_PORT} --> ${target}`
    );
  } catch (error) {
    logError("Error while upgrading connection to container", error.message);
    socket.destroy();
  }
});
