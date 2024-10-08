import mongoose from "mongoose";
import { logError } from "../Utils/index.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_HOST = process.env.MONGODB_HOST || "mongodb";
const MONGODB_PORT = process.env.MONGODB_PORT || "27017";
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || "docker-reverse-proxy";
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;

let MONGODB_URI;

if (MONGODB_USERNAME && MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=admin`;
} else {
  MONGODB_URI = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=admin`;
}

const MONGO_URI = process.env.MONGO_URI || MONGODB_URI;

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(`mongodb://admin:admin@mongodb:27017/${MONGODB_DATABASE}?authSource=admin`);
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
