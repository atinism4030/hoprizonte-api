import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IProjectPlanAI,
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
    projectPlan: IProjectPlanAI,
    userId: string,
    fullAiResponseJson: string,
  ): Promise<IProject> {
    // Add default subtasks to each task
    const tasksWithSubtasks = projectPlan.tasks.map((task, index) => ({
      ...task,
      status: 'not_started' as const,
      subtasks: [
        { id: `${index}-1`, title: 'Preparation', completed: false },
        { id: `${index}-2`, title: 'Execution', completed: false },
        { id: `${index}-3`, title: 'Cleanup', completed: false },
      ]
    }));

    const projectToSave: Partial<IProject> = {
      ...projectPlan,
      tasks: tasksWithSubtasks,
      user_id: userId,
      full_ai_response_json: fullAiResponseJson,
      total_spent: '0',
    };

    const createdProject = new this.projectModel(projectToSave);
    const savedProject = await createdProject.save();

    return savedProject.toJSON() as IProject;
  }

  async findById(projectId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();
    return project ? project.toJSON() as IProject : null;
  }

  async getUserProjects(userId: string) {
    const projects = await this.projectModel.find({ user_id: userId }).sort({ createdAt: -1 }).exec();
    return projects;
  }

  // Update entire project
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

  // Update a specific task
  async updateTask(projectId: string, taskId: string, updates: UpdateTaskDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const taskIndex = project.tasks.findIndex((t: any) => t._id.toString() === taskId);

    if (taskIndex === -1) {
      throw new NotFoundException('Task not found');
    }

    // Update the specific task fields
    Object.keys(updates).forEach(key => {
      project.tasks[taskIndex][key] = updates[key];
    });

    await project.save();

    // Recalculate total spent
    await this.recalculateTotalSpent(projectId);

    return this.findById(projectId);
  }

  // Toggle subtask completion
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

    // Toggle the subtask completion
    project.tasks[taskIndex].subtasks[subtaskIndex].completed = !project.tasks[taskIndex].subtasks[subtaskIndex].completed;

    // Check if all subtasks are completed, update task status
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

  // Update a specific phase
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

  // Add a new phase
  async addPhase(projectId: string, phase: AddPhaseDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Generate new phase ID
    const maxId = Math.max(...project.phases.map((p: any) => p.id), 0);
    const newPhase = {
      ...phase,
      id: maxId + 1,
      status: 'not_started',
    };

    project.phases.push(newPhase);
    await project.save();

    return this.findById(projectId);
  }

  // Delete a phase
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

  // Update a specific material
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

  // Add a new material
  async addMaterial(projectId: string, material: AddMaterialDTO): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.materials_summary.push(material);
    await project.save();

    return this.findById(projectId);
  }

  // Delete a material
  async deleteMaterial(projectId: string, materialId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.materials_summary = project.materials_summary.filter((m: any) => m._id.toString() !== materialId);
    await project.save();

    return this.findById(projectId);
  }

  // Add a new task
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
        { id: `${taskCount}-1`, title: 'Preparation', completed: false },
        { id: `${taskCount}-2`, title: 'Execution', completed: false },
        { id: `${taskCount}-3`, title: 'Cleanup', completed: false },
      ]
    };

    project.tasks.push(newTask);
    await project.save();

    return this.findById(projectId);
  }

  // Delete a task
  async deleteTask(projectId: string, taskId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.tasks = project.tasks.filter((t: any) => t._id.toString() !== taskId);
    await project.save();

    return this.findById(projectId);
  }

  // Recalculate total spent based on all paid amounts
  async recalculateTotalSpent(projectId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      return;
    }

    let totalSpent = 0;
    project.tasks.forEach((task: any) => {
      if (task.total_paid) {
        // Parse the amount, removing currency symbols and commas
        const amount = parseFloat(task.total_paid.replace(/[^0-9.-]+/g, '')) || 0;
        totalSpent += amount;
      }
    });

    project.total_spent = totalSpent.toString();
    await project.save();
  }

  // Get project statistics
  async getProjectStats(projectId: string) {
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t: any) => t.status === 'done').length;
    const inProgressTasks = project.tasks.filter((t: any) => t.status === 'in_progress').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate budget
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