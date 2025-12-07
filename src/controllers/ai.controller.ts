import {Controller } from '@nestjs/common';

import { AiService } from 'src/services/ai.service';

@Controller('ai')
export class AiController {

    constructor(private readonly aiController: AiController, private readonly aiService: AiService) {}
  

}
