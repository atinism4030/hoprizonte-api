import mongoose, { HydratedDocument } from "mongoose";

const ProjectDetailsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["RENOVATION", "CONSTRUCTION"], required: true },
  location: { type: String, default: "Shkup" },
  total_estimated_cost: { type: String },
  total_estimated_time_months: { type: Number },
});

const PhaseSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  duration_months: { type: Number },
  cost_range_eur: { type: String },
});

const TaskSchema = new mongoose.Schema({
  phase_id: { type: Number, required: true },
  task: { type: String, required: true },
  industry: { type: String },
  materials: [{ type: String }],
  time_weeks: { type: Number },
  cost_range_eur: { type: String },
});

const MaterialSummarySchema = new mongoose.Schema({
  material: { type: String },
  estimated_quantity: { type: String },
  estimated_cost_eur: { type: String },
});

const RiskAnalysisSchema = new mongoose.Schema({
  type: { type: String },
  description: { type: String },
  impact_level: { type: String, enum: ["HIGH", "MEDIUM", "LOW"] },
});

const RecommendedCompanySchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
});

const RecommendedIndustrySchema = new mongoose.Schema({
  industry: { type: String },
  companies: [{ type: RecommendedCompanySchema }],
});

export const ProjectSchema = new mongoose.Schema(
  {
    project: { type: ProjectDetailsSchema, required: true },
    phases: [{ type: PhaseSchema }],
    tasks: [{ type: TaskSchema }],
    materials_summary: [{ type: MaterialSummarySchema }],
    risk_analysis: [{ type: RiskAnalysisSchema }],
    budget_tips: [{ type: String }],
    recommended_companies: [{ type: RecommendedIndustrySchema }],
    user_id: { type: String, required: true, index: true },
    full_ai_response_json: { type: String, required: true },
  },
  { timestamps: true }
);

export type ProjectDocument = HydratedDocument<any>;

export const ProjectModel = mongoose.model("Project", ProjectSchema);
