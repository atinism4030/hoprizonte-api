import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ProjectService } from 'src/services/project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @Post('save-from-ai')
  async saveFromAI(
    @Body() body: {
      projectPlan: any;
      fullAiResponseJson: string;
    },
    @Query("user_id") user_id: string,
    @Req() req: any,
  ) {
    return this.projectService.create(
      body.projectPlan,
      user_id,
      body.fullAiResponseJson,
    );
  }

  @Get("/user/:user_id")
  async getUserProjects(@Param("user_id") user_id: string) {
    const data = await this.projectService.getUserProjects(user_id);
    return data;
  }

  @Get("/:project_id")
  async getProject(@Param("project_id") project_id: string) {
    return await this.projectService.findById(project_id);
  }

  @Get("/:project_id/stats")
  async getProjectStats(@Param("project_id") project_id: string) {
    return await this.projectService.getProjectStats(project_id);
  }

  // Task endpoints
  @Patch("/:project_id/tasks/:task_id")
  async updateTask(
    @Param("project_id") project_id: string,
    @Param("task_id") task_id: string,
    @Body() updates: any,
  ) {
    return await this.projectService.updateTask(project_id, task_id, updates);
  }

  @Post("/:project_id/tasks")
  async addTask(
    @Param("project_id") project_id: string,
    @Body() task: any,
  ) {
    return await this.projectService.addTask(project_id, task);
  }

  @Delete("/:project_id/tasks/:task_id")
  async deleteTask(
    @Param("project_id") project_id: string,
    @Param("task_id") task_id: string,
  ) {
    return await this.projectService.deleteTask(project_id, task_id);
  }

  // Subtask toggle
  @Patch("/:project_id/tasks/:task_id/subtasks/:subtask_id/toggle")
  async toggleSubtask(
    @Param("project_id") project_id: string,
    @Param("task_id") task_id: string,
    @Param("subtask_id") subtask_id: string,
  ) {
    return await this.projectService.toggleSubtask(project_id, task_id, subtask_id);
  }

  // Phase endpoints
  @Patch("/:project_id/phases/:phase_id")
  async updatePhase(
    @Param("project_id") project_id: string,
    @Param("phase_id") phase_id: string,
    @Body() updates: any,
  ) {
    return await this.projectService.updatePhase(project_id, parseInt(phase_id), updates);
  }

  @Post("/:project_id/phases")
  async addPhase(
    @Param("project_id") project_id: string,
    @Body() phase: any,
  ) {
    return await this.projectService.addPhase(project_id, phase);
  }

  @Delete("/:project_id/phases/:phase_id")
  async deletePhase(
    @Param("project_id") project_id: string,
    @Param("phase_id") phase_id: string,
  ) {
    return await this.projectService.deletePhase(project_id, parseInt(phase_id));
  }

  // Material endpoints
  @Patch("/:project_id/materials/:material_id")
  async updateMaterial(
    @Param("project_id") project_id: string,
    @Param("material_id") material_id: string,
    @Body() updates: any,
  ) {
    return await this.projectService.updateMaterial(project_id, material_id, updates);
  }

  @Post("/:project_id/materials")
  async addMaterial(
    @Param("project_id") project_id: string,
    @Body() material: any,
  ) {
    return await this.projectService.addMaterial(project_id, material);
  }

  @Delete("/:project_id/materials/:material_id")
  async deleteMaterial(
    @Param("project_id") project_id: string,
    @Param("material_id") material_id: string,
  ) {
    return await this.projectService.deleteMaterial(project_id, material_id);
  }
}
