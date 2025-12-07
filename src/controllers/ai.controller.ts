import { Controller, Get, Query, Res } from '@nestjs/common';
import { type Response } from 'express';
import { AiService } from 'src/services/ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('stream')
    async stream(@Query('prompt') prompt: string, @Res() res: Response) {
        console.log({ prompt });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        await this.aiService.stream(prompt, (chunk) => {
            res.write(`data: ${chunk}\n\n`);
        });

        res.end();
    }
}
