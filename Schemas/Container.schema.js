import mongoose from "mongoose";

export const ContainerSchema = new mongoose.Schema(
  {
    containerId: { type: String, required: true, unique: true },
    containerName: { type: String, required: true, unique: true },
    imageUsed: { type: String, required: true },
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

// ContainerSchema.virtual("a", {
//   countries: { type: String, required: true },
//   get: function () {
//     return this.countries.split(",").map((country) => country.trim());
//   },
//   set: function (countries) {
//     this.countries = countries.join(",");
//   },
//   validate: {
//     validator: function (v) {
//       return /^[a-zA-Z, ]+$/.test(v);
//     },
//     message: "Countries must be a comma-separated list of valid country names.",
//   },
//   default: [
//     "USA",
//     "Canada",
//     "Mexico",
//     "Brazil",
//     "Argentina",
//     "Chile",
//     "Peru",
//     "Colombia",
//     "Venezuela",
//     "Ecuador",
//     "Guatemala",
//     "Cuba",
//     "Honduras",
//     "Nicaragua",
//     "Costa Rica",
//     "Panama",
//     "Dominican Republic",
//     "Jamaica",
//     "Belize",
//     "Trinidad and Tobago",
//     "Bolivia",
//     "Paraguay",
//     "Suriname",
//     "Uruguay",
//     "French Guiana",
//     "Guyana",
//     "Cuba",
//     "Haiti",
//     "Dominica",
//     "Saint Vincent and the Grenadines",
//     "Barbados",
//     "Antig",
//   ],
//   required: true,
//   select: false,
// });
