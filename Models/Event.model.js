import mongoose from "mongoose";
import { EventSchema } from "../Schemas/index.js";

export const Event = mongoose.model("Event", EventSchema);
