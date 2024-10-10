import express from "express";
import {
  containerStatus,
  createContainer,
  deleteContainer,
} from "../Controller/container.controller.js";

const managementApiRouter = express.Router();

managementApiRouter
  .get("/containers/status/:requestId", containerStatus)
  .post("/containers", createContainer)
  .delete("/containers", deleteContainer);

export default managementApiRouter;
