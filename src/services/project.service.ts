import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IProjectPlanAI, IProject } from '../types/project.types';
import { ProjectDocument } from 'src/models/Project.model';

const PROJECT_MODEL_NAME = 'Project';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(PROJECT_MODEL_NAME) private projectModel: Model<ProjectDocument>,
  ) {}

 
  async create(
    projectPlan: IProjectPlanAI,
    userId: string,
    fullAiResponseJson: string,
  ): Promise<IProject> {
    
    const projectToSave: Partial<IProject> = {
      ...projectPlan,
      user_id: userId,
      full_ai_response_json: fullAiResponseJson,
    };

    const createdProject = new this.projectModel(projectToSave);
    
    const savedProject = await createdProject.save();

    return savedProject.toJSON() as IProject;
  }


  async findById(projectId: string): Promise<IProject | null> {
    const project = await this.projectModel.findById(projectId).exec();
    return project ? project.toJSON() as IProject : null;
  }
}