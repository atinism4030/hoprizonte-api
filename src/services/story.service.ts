import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor() {
    
  }

}
