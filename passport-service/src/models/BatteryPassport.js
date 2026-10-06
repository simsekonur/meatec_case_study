const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const batteryModelSchema = new mongoose.Schema(
  {
    id: { type: String },
    modelName: { type: String },
  },
  { _id: false }
);

const manufacturerInformationSchema = new mongoose.Schema(
  {
    manufacturerName: { type: String },
    manufacturerIdentifier: { type: String },
  },
  { _id: false }
);

const generalInformationSchema = new mongoose.Schema(
  {
    batteryIdentifier: { type: String, required: true, unique: true, index: true },
    batteryModel: batteryModelSchema,
    batteryMass: { type: Number },
    batteryCategory: { type: String, enum: ['EV', 'Industrial', 'Stationary', 'Other'] },
    batteryStatus: { type: String },
    manufacturingDate: { type: String },
    manufacturingPlace: { type: String },
    warrantyPeriod: { type: String },
    manufacturerInformation: manufacturerInformationSchema,
  },
  { _id: false }
);

const hazardousSubstanceSchema = new mongoose.Schema(
  {
    substanceName: { type: String },
    chemicalFormula: { type: String },
    casNumber: { type: String },
  },
  { _id: false }
);

const materialCompositionSchema = new mongoose.Schema(
  {
    batteryChemistry: { type: String },
    criticalRawMaterials: [{ type: String }],
    hazardousSubstances: [hazardousSubstanceSchema],
  },
  { _id: false }
);

const carbonFootprintSchema = new mongoose.Schema(
  {
    totalCarbonFootprint: { type: Number },
    measurementUnit: { type: String },
    methodology: { type: String },
  },
  { _id: false }
);

const passportDataSchema = new mongoose.Schema(
  {
    generalInformation: generalInformationSchema,
    materialComposition: materialCompositionSchema,
    carbonFootprint: carbonFootprintSchema,
  },
  { _id: false }
);

// ─── Root Schema ─────────────────────────────────────────────────────────────

const batteryPassportSchema = new mongoose.Schema(
  {
    data: {
      type: passportDataSchema,
      required: true,
    },
    createdBy: {
      type: String, // user ID from JWT
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

module.exports = mongoose.model('BatteryPassport', batteryPassportSchema);
