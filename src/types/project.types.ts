export interface ISubTask {
  id?: string;
  title: string;
  completed: boolean;
}

export interface ISuggestedCompany {
  id?: string;
  name: string;
  industry?: string;
  rating?: number;
  verified?: boolean;
  price_range?: string;
  timeline?: string;
  location?: string;
}

export interface IWork {
  task: string;
  description: string;
  cost_range_eur: string;
  time_duration: string;
  whats_included?: string[];
  pro_tips?: string[];
  suggested_companies?: ISuggestedCompany[];
}

export interface IPhase {
  id: number;
  name: string;
  duration_months?: number;
  cost_range_eur?: string;
  status?: 'not_started' | 'in_progress' | 'done';
  start_date?: string;
  end_date?: string;
  works?: IWork[];
}

export interface ITask {
  _id?: string;
  phase_id: number;
  task: string;
  industry?: string;
  materials?: string[];
  time_weeks?: number;
  time_duration?: string;
  cost_range_eur?: string;
  description?: string;
  whats_included?: string[];
  pro_tips?: string[];
  suggested_companies?: ISuggestedCompany[];
  status?: 'not_started' | 'in_progress' | 'done';
  assigned_company?: string;
  assigned_company_id?: string;
  agreed_price?: string;
  advance_paid?: string;
  total_paid?: string;
  start_date?: string;
  end_date?: string;
  subtasks?: ISubTask[];
}

export interface IMaterialSummary {
  _id?: string;
  material: string;
  estimated_quantity: string;
  estimated_cost_eur: string;
}

export interface IRiskAnalysis {
  type: string;
  description: string;
  impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IRecommendedCompany {
  name: string;
  description: string;
}

export interface IRecommendedIndustry {
  industry: string;
  companies: IRecommendedCompany[];
}

export interface IProjectDetails {
  title: string;
  type: 'RENOVATION' | 'CONSTRUCTION';
  location: string;
  total_estimated_cost: string;
  total_estimated_time_months: number;
}

export interface IProject {
  _id?: string;
  project: IProjectDetails;
  phases: IPhase[];
  tasks: ITask[];
  materials_summary: IMaterialSummary[];
  risk_analysis: IRiskAnalysis[];
  budget_tips: string[];
  recommended_companies: IRecommendedIndustry[];
  user_id: string;
  full_ai_response_json: string;
  total_spent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateTaskDTO {
  status?: 'not_started' | 'in_progress' | 'done';
  assigned_company?: string;
  assigned_company_id?: string;
  description?: string;
  agreed_price?: string;
  advance_paid?: string;
  total_paid?: string;
  start_date?: string;
  end_date?: string;
  subtasks?: ISubTask[];
}

export interface UpdatePhaseDTO {
  name?: string;
  duration_months?: number;
  cost_range_eur?: string;
  status?: 'not_started' | 'in_progress' | 'done';
  start_date?: string;
  end_date?: string;
}

export interface UpdateMaterialDTO {
  material?: string;
  estimated_quantity?: string;
  estimated_cost_eur?: string;
}

export interface AddPhaseDTO {
  name: string;
  duration_months: number;
  cost_range_eur: string;
}

export interface AddMaterialDTO {
  material: string;
  estimated_quantity: string;
  estimated_cost_eur: string;
}

export interface AddTaskDTO {
  phase_id: number;
  task: string;
  industry?: string;
  materials?: string[];
  time_weeks?: number;
  cost_range_eur?: string;
  description?: string;
}