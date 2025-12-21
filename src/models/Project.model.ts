import mongoose, { HydratedDocument } from "mongoose";

const SubTaskSchema = new mongoose.Schema({
  id: { type: String },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const ProjectDetailsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["RENOVATION", "CONSTRUCTION"], required: true },
  location: { type: String, default: "Shkup" },
  total_estimated_cost: { type: String },
  total_estimated_time_months: { type: Number },
});

const SuggestedCompanySchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String },
  industry: { type: String },
  rating: { type: Number },
  verified: { type: Boolean, default: true },
  price_range: { type: String },
  timeline: { type: String },
  location: { type: String },
});

const WorkSchema = new mongoose.Schema({
  task: { type: String },
  description: { type: String },
  cost_range_eur: { type: String },
  time_duration: { type: String },
  whats_included: [{ type: String }],
  pro_tips: [{ type: String }],
  suggested_companies: [{ type: SuggestedCompanySchema }],
});

const PhaseSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  duration_months: { type: Number },
  cost_range_eur: { type: String },
  status: { type: String, enum: ["not_started", "in_progress", "done"], default: "not_started" },
  start_date: { type: String },
  end_date: { type: String },
  works: [{ type: WorkSchema }],
});

const TaskSchema = new mongoose.Schema({
  phase_id: { type: Number, required: true },
  task: { type: String, required: true },
  industry: { type: String },
  materials: [{ type: String }],
  time_weeks: { type: Number },
  time_duration: { type: String },
  cost_range_eur: { type: String },
  description: { type: String },
  whats_included: [{ type: String }],
  pro_tips: [{ type: String }],
  suggested_companies: [{ type: SuggestedCompanySchema }],
  status: { type: String, enum: ["not_started", "in_progress", "done"], default: "not_started" },
  assigned_company: { type: String },
  assigned_company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
  agreed_price: { type: String },
  advance_paid: { type: String, default: "0" },
  total_paid: { type: String, default: "0" },
  start_date: { type: String },
  end_date: { type: String },
  subtasks: [{ type: SubTaskSchema }],
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
    total_spent: { type: String, default: "0" },
  },
  { timestamps: true }
);

export type ProjectDocument = HydratedDocument<any>;

export const ProjectModel = mongoose.model("Project", ProjectSchema);
