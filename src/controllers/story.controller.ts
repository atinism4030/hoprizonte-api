import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Param, Delete } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateStoryDto } from "src/DTO/story.dto";
import { StoryService } from "src/services/story.service";

@Controller("stories")
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

@Post("/create-story")
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('company') companyId: string,
  ) {
    return this.storyService.createWithFile(file, companyId);
  }
  @Get()
  findAll() {
    return this.storyService.findAll();
  }

  @Get("/:id")
  findById(@Param("id") id: string) {
    return this.storyService.findById(id);
  }

  @Get("/company/:companyId")
  findByCompany(@Param("companyId") companyId: string) {
    return this.storyService.findByCompany(companyId);
  }

  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.storyService.delete(id);
  }
}
