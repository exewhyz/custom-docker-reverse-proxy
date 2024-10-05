import express from "express";
import {
  containerStatus,
  createContainer,
} from "../Controller/createContainer.controller.js";

const managementApiRouter = express.Router();

managementApiRouter
  .get("/containers/status/:requestId", containerStatus)
  .post("/containers", createContainer);

export default managementApiRouter;
