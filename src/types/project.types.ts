interface IPhase {
  id: number;
  name: string;
  duration_months: number;
  cost_range_eur: string;
}

interface ITask {
  phase_id: number;
  task: string;
  industry: string;
  materials: string[];
  time_weeks: number;
  cost_range_eur: string;
}

interface IMaterialSummary {
  material: string;
  estimated_quantity: string;
  estimated_cost_eur: string;
}

interface IRiskAnalysis {
  type: string;
  description: string;
  impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface IRecommendedCompany {
  name: string;
  description: string;
}

interface IRecommendedIndustry {
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
  createdAt?: Date;
  updatedAt?: Date;
}