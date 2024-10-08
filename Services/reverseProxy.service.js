import express from "express";
import httpProxy from "http-proxy";
// import { db } from "./docker.service.js";
import { Container } from "../Models/index.js";
import { logError } from "../Utils/index.js";

const proxy = httpProxy.createProxy({});

export const reverseProxyApp = express();

reverseProxyApp.use(async (req, res) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  // if (!db.has(subDomain)) {
  //   return res.status(404).send("Container not found");
  // }

  const container = await Container.findOne({
    containerName: subDomain,
  });

  if (!container) {
    return res.status(404).send("Container not found");
  }

  const { ipAddress, defaultPort } = container;
  // const { ipAddress, defaultPort } = db.get(subDomain);
  const target = `http://${ipAddress}:${defaultPort}`;
  console.log("IPADD", ipAddress);

  try {
    proxy.web(req, res, { target, changeOrigin: true, ws: true });
  } catch (error) {
    logError("Error Forwarding request to server ", error);
  }
  console.log(`Forwarding http://${hostname} --> ${target}`);
});

reverseProxyApp.on("upgrade", async (req, socket, head) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  // if (!db.has(subDomain)) {
  //   socket.destroy();
  //   return;
  // }
  const container = await Container.findOne({
    containerName: subDomain,
  });
  if (!container) {
    socket.destroy();
    return;
  }
  console.log(container);

  const { ipAddress, defaultPort } = container;
  // const { ipAddress, defaultPort } = db.get(subDomain);
  const target = `http://${ipAddress}:${defaultPort}`;

  proxy.ws(req, socket, head, { target, ws: true });
  console.log(`Forwarding ws://${hostname} --> ${target}`);
});
