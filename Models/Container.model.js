import mongoose from "mongoose";
import { ContainerSchema } from "../Schemas/index.js";

export const Container = mongoose.model('Container', ContainerSchema);