export interface ISubTask {
  id?: string;
  title: string;
  completed: boolean;
}

export interface IPhase {
  id: number;
  name: string;
  duration_months: number;
  cost_range_eur: string;
  status?: 'not_started' | 'in_progress' | 'done';
  start_date?: string;
  end_date?: string;
}

export interface ITask {
  _id?: string;
  phase_id: number;
  task: string;
  industry: string;
  materials: string[];
  time_weeks: number;
  cost_range_eur: string;
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

export interface IProjectPlanAI {
  project: {
    title: string;
    type: 'RENOVATION' | 'CONSTRUCTION';
    location: string;
    total_estimated_cost: string;
    total_estimated_time_months: number;
  };
  phases: IPhase[];
  tasks: ITask[];
  materials_summary: IMaterialSummary[];
  risk_analysis: IRiskAnalysis[];
  budget_tips: string[];
  recommended_companies: IRecommendedIndustry[];
}

export interface IProject extends IProjectPlanAI {
  _id?: string;
  user_id: string;
  full_ai_response_json: string;
  total_spent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// DTOs for updates
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
}