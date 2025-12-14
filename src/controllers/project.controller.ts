import { Body, Controller, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProjectService } from 'src/services/project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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
}
