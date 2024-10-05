import express from "express";
import httpProxy from "http-proxy";
import { db } from "./docker.service.js";

const proxy = httpProxy.createProxy({});

export const reverseProxyApp = express();

reverseProxyApp.use((req, res) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  if (!db.has(subDomain)) {
    return res.status(404).send("Container not found");
  }

  const { ipAddress, defaultPort } = db.get(subDomain);
  const target = `http://${ipAddress}:${defaultPort}`;

  console.log(`Forwarding http://${hostname} --> ${target}`);

  proxy.web(req, res, { target, changeOrigin: true, ws: true });
});

reverseProxyApp.on("upgrade", (req, socket, head) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  if (!db.has(subDomain)) {
    socket.destroy();
    return;
  }

  const { ipAddress, defaultPort } = db.get(subDomain);
  const target = `http://${ipAddress}:${defaultPort}`;

  proxy.ws(req, socket, head, { target, ws: true });
});
