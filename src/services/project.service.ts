import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IProject,
  UpdateTaskDTO,
  UpdatePhaseDTO,
  UpdateMaterialDTO,
  AddPhaseDTO,
  AddMaterialDTO,
  AddTaskDTO,
  ISubTask
} from '../types/project.types';
import { ProjectDocument } from 'src/models/Project.model';

const PROJECT_MODEL_NAME = 'Project';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(PROJECT_MODEL_NAME) private projectModel: Model<ProjectDocument>,
  ) { }

  async create(
    aiResponse: any,
    userId: string,
    fullAiResponseJson: string,
  ): Promise<IProject> {
    const phases = aiResponse.phases || [];
    const project = aiResponse.project || {};

    const formattedPhases = phases.map((phase: any, index: number) => ({
      id: phase.id || index + 1,
      name: phase.name,
      duration_months: this.estimateDurationMonths(phase.works),
      cost_range_eur: this.estimatePhaseCost(phase.works),
      status: 'not_started' as const,
      works: phase.works || [],
    }));

    const tasks: any[] = [];
    phases.forEach((phase: any) => {
      if (phase.works && Array.isArray(phase.works)) {
        phase.works.forEach((work: any, workIndex: number) => {
          tasks.push({
            phase_id: phase.id,
            task: work.task,
            description: work.description,
            cost_range_eur: work.cost_range_eur,
            time_duration: work.time_duration,
            time_weeks: this.parseDurationToWeeks(work.time_duration),
            industry: work.suggested_companies?.[0]?.industry || '',
            materials: [],
            whats_included: work.whats_included || [],
            pro_tips: work.pro_tips || [],
            suggested_companies: work.suggested_companies || [],
            status: 'not_started' as const,
            subtasks: [
              { id: `${phase.id}-${workIndex}-1`, title: 'Përgatitje', completed: false },
              { id: `${phase.id}-${workIndex}-2`, title: 'Ekzekutim', completed: false },
              { id: `${phase.id}-${workIndex}-3`, title: 'Përfundim', completed: false },
            ]
          });
        });
      }
    });

    const projectToSave: Partial<IProject> = {
      project: {
        title: project.title || 'Projekt i Ri',
        type: project.project_type_description?.toLowerCase().includes('renovim') ? 'RENOVATION' : 'CONSTRUCTION',
        location: 'Shkup',
        total_estimated_cost: project.total_estimated_cost || '€0',
        total_estimated_time_months: parseInt(project.total_estimated_time_months) || 6,
      },
      phases: formattedPhases,
      tasks: tasks,
      materials_summary: [],
      risk_analysis: [],
      budget_tips: [],
      recommended_companies: [],
      user_id: userId,
      full_ai_response_json: fullAiResponseJson,
      total_spent: '0',
    };

    const createdProject = new this.projectModel(projectToSave);
    const savedProject = await createdProject.save();

    return savedProject.toJSON() as IProject;
  }

  private estimateDurationMonths(works: any[]): number {
    if (!works || works.length === 0) return 1;
    let totalWeeks = 0;
    works.forEach(work => {
      totalWeeks += this.parseDurationToWeeks(work.time_duration);
    });
    return Math.max(1, Math.ceil(totalWeeks / 4));
  }

  private estimatePhaseCost(works: any[]): string {
    if (!works || works.length === 0) return '€0';
    let minTotal = 0;
    let maxTotal = 0;
    works.forEach(work => {
      const costs = this.parseCostRange(work.cost_range_eur);
      minTotal += costs.min;
      maxTotal += costs.max;
    });
    return `€${minTotal.toLocaleString()} - €${maxTotal.toLocaleString()}`;
  }

  private parseCostRange(costStr: string): { min: number; max: number } {
    if (!costStr) return { min: 0, max: 0 };
    const numbers = costStr.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) return { min: 0, max: 0 };
    const values = numbers.map(n => parseInt(n.replace(/,/g, '')) || 0);
    return {
      min: values[0] || 0,
      max: values[1] || values[0] || 0
    };
  }

  private parseDurationToWeeks(duration: string): number {
    if (!duration) return 1;
    const lowerDuration = duration.toLowerCase();
    const numbers = duration.match(/\d+/g);
    if (!numbers) return 1;
    const firstNum = parseInt(numbers[0]) || 1;

    if (lowerDuration.includes('ditë') || lowerDuration.includes('dite')) {
      return Math.ceil(firstNum / 7);
    }
    if (lowerDuration.includes('javë') || lowerDuration.includes('jave')) {
      return firstNum;
    }
    if (lowerDuration.includes('muaj')) {
      return firstNum * 4;
    }
    return 1;
  }

  async findById(projectId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();
    return project ? project.toJSON() as IProject : null;
  }

  async getUserProjects(userId: string) {
    const projects = await this.projectModel.find({ user_id: userId }).sort({ createdAt: -1 }).exec();
    return projects;
  }

  async updateProject(projectId: string, updates: Partial<IProject>): Promise<IProject | null> {
    const project = await this.projectModel.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { new: true }
    ).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.toJSON() as IProject;
  }

  async updateTask(projectId: string, taskId: string, updates: UpdateTaskDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const taskIndex = project.tasks.findIndex((t: any) => t._id.toString() === taskId);

    if (taskIndex === -1) {
      throw new NotFoundException('Task not found');
    }

    Object.keys(updates).forEach(key => {
      project.tasks[taskIndex][key] = updates[key];
    });

    await project.save();
    await this.recalculateTotalSpent(projectId);

    return this.findById(projectId);
  }

  async toggleSubtask(projectId: string, taskId: string, subtaskId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const taskIndex = project.tasks.findIndex((t: any) => t._id.toString() === taskId);

    if (taskIndex === -1) {
      throw new NotFoundException('Task not found');
    }

    const subtaskIndex = project.tasks[taskIndex].subtasks?.findIndex((s: any) => s.id === subtaskId || s._id?.toString() === subtaskId);

    if (subtaskIndex === -1 || subtaskIndex === undefined) {
      throw new NotFoundException('Subtask not found');
    }

    project.tasks[taskIndex].subtasks[subtaskIndex].completed = !project.tasks[taskIndex].subtasks[subtaskIndex].completed;

    const allCompleted = project.tasks[taskIndex].subtasks.every((s: ISubTask) => s.completed);
    const someCompleted = project.tasks[taskIndex].subtasks.some((s: ISubTask) => s.completed);

    if (allCompleted) {
      project.tasks[taskIndex].status = 'done';
    } else if (someCompleted) {
      project.tasks[taskIndex].status = 'in_progress';
    } else {
      project.tasks[taskIndex].status = 'not_started';
    }

    await project.save();
    return this.findById(projectId);
  }

  async updatePhase(projectId: string, phaseId: number, updates: UpdatePhaseDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const phaseIndex = project.phases.findIndex((p: any) => p.id === phaseId);

    if (phaseIndex === -1) {
      throw new NotFoundException('Phase not found');
    }

    Object.keys(updates).forEach(key => {
      project.phases[phaseIndex][key] = updates[key];
    });

    await project.save();
    return this.findById(projectId);
  }

  async addPhase(projectId: string, phase: AddPhaseDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const maxId = Math.max(...project.phases.map((p: any) => p.id), 0);
    const newPhase = {
      ...phase,
      id: maxId + 1,
      status: 'not_started',
      works: [],
    };

    project.phases.push(newPhase);
    await project.save();

    return this.findById(projectId);
  }

  async deletePhase(projectId: string, phaseId: number): Promise<IProject | null> {
    const project = await this.projectModel.findByIdAndUpdate(
      projectId,
      { $pull: { phases: { id: phaseId } } },
      { new: true }
    ).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.toJSON() as IProject;
  }

  async updateMaterial(projectId: string, materialId: string, updates: UpdateMaterialDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const materialIndex = project.materials_summary.findIndex((m: any) => m._id.toString() === materialId);

    if (materialIndex === -1) {
      throw new NotFoundException('Material not found');
    }

    Object.keys(updates).forEach(key => {
      project.materials_summary[materialIndex][key] = updates[key];
    });

    await project.save();
    return this.findById(projectId);
  }

  async addMaterial(projectId: string, material: AddMaterialDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.materials_summary.push(material);
    await project.save();

    return this.findById(projectId);
  }

  async deleteMaterial(projectId: string, materialId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.materials_summary = project.materials_summary.filter((m: any) => m._id.toString() !== materialId);
    await project.save();

    return this.findById(projectId);
  }

  async addTask(projectId: string, task: AddTaskDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const taskCount = project.tasks.length;
    const newTask = {
      ...task,
      status: 'not_started',
      subtasks: [
        { id: `${taskCount}-1`, title: 'Përgatitje', completed: false },
        { id: `${taskCount}-2`, title: 'Ekzekutim', completed: false },
        { id: `${taskCount}-3`, title: 'Përfundim', completed: false },
      ]
    };

    project.tasks.push(newTask);
    await project.save();

    return this.findById(projectId);
  }

  async deleteTask(projectId: string, taskId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.tasks = project.tasks.filter((t: any) => t._id.toString() !== taskId);
    await project.save();

    return this.findById(projectId);
  }

  async recalculateTotalSpent(projectId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      return;
    }

    let totalSpent = 0;
    project.tasks.forEach((task: any) => {
      if (task.total_paid) {
        const amount = parseFloat(task.total_paid.replace(/[^0-9.-]+/g, '')) || 0;
        totalSpent += amount;
      }
    });

    project.total_spent = totalSpent.toString();
    await project.save();
  }

  async getProjectStats(projectId: string) {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t: any) => t.status === 'done').length;
    const inProgressTasks = project.tasks.filter((t: any) => t.status === 'in_progress').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalBudgetStr = project.project?.total_estimated_cost || '0';
    const totalBudget = parseFloat(totalBudgetStr.replace(/[^0-9.-]+/g, '')) || 0;
    const totalSpent = parseFloat(project.total_spent || '0');
    const remaining = totalBudget - totalSpent;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks: totalTasks - completedTasks - inProgressTasks,
      progress,
      totalBudget,
      totalSpent,
      remaining,
    };
  }
}