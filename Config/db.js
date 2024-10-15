import mongoose from "mongoose";

import { logError } from "../Utils/index.js";
import { MONGO_URI } from "./index.js";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    logError("MongoDB connection unsuccessful", error);
    setTimeout(connectToDatabase, 5 * 1000);
  }
};

export const closeDbConnection = () => {
  mongoose.connection
    .close()
    .then(() => console.log("MongoDB connection closed"))
    .catch((error) => logError("Error closing MongoDB connection", error));
};
