import express from "express";
import httpProxy from "http-proxy";
// import { db } from "./docker.service.js";
import { logError } from "../Utils/index.js";
import { validateContainer } from "./docker.service.js";
import { PROTOCOL } from "../Config/index.js";

const proxy = httpProxy.createProxy({});

export const reverseProxyApp = express();

reverseProxyApp.use(async (req, res) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  // if (!db.has(subDomain)) {
  //   return res.status(404).send("Container not found");
  // }

  try {
    const container = await validateContainer(subDomain);

    if (!container) {
      return res.status(404).send("Container not found");
    }

    const { ipAddress, defaultPort } = container;

    // const { ipAddress, defaultPort } = db.get(subDomain);
    const target = `${PROTOCOL}://${ipAddress}:${defaultPort}`;

    proxy.web(req, res, { target, changeOrigin: true, ws: true });

    console.log(`Forwarding ${PROTOCOL}://${hostname} --> ${target}`);
  } catch (error) {
    logError("Error while finding container inside reverse proxy", error);
    res
      .status(404)
      .send(
        "Error while finding container inside reverse proxy: " + error.message
      );
  }
});

reverseProxyApp.on("upgrade", async (req, socket, head) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  // if (!db.has(subDomain)) {
  //   socket.destroy();
  //   return;
  // }
  const container = await validateContainer(subDomain);
  if (!container) {
    socket.destroy();
    return;
  }

  const { ipAddress, defaultPort } = container;
  // const { ipAddress, defaultPort } = db.get(subDomain);
  const target = `${PROTOCOL}://${ipAddress}:${defaultPort}`;

  proxy.ws(req, socket, head, { target, ws: true });
  console.log(`Forwarding ws://${hostname} --> ${target}`);
});
