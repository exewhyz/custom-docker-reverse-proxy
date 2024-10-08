import mongoose from "mongoose";

export const ContainerSchema = new mongoose.Schema(
  {
    containerName: { type: String, required: true, unique: true },
    ipAddress: { type: String, required: true },
    defaultPort: { type: Number, required: true },
  },
  { timestamps: true }
);

ContainerSchema.statics.findOrCreate = async function (containerData) {
  let container = await this.findOne({
    containerName: containerData.containerName,
  });
  if (!container) {
    container = await this.create(containerData);
  }
  return container;
};
