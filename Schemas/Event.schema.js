import mongoose from "mongoose";

export const EventSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ["initializing", "pulling", "creating", "running", "error"],
    },
    message: { type: String, required: true },
    containerId: { type: String, required: true },
    containerName: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

EventSchema.statics.createOrUpdate = async function (eventData) {
  const event = await this.findOneAndUpdate(
    { requestId: eventData.requestId },
    { ...eventData, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return event;
};
