import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface Prompt {
  system: string;
  user: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  async generate(prompt: Prompt): Promise<string> {
    const body = {
      model: 'mistral-large-latest',
      stream: false,
      messages: [
        {
          role: 'system',
          content: prompt.system,
        },
        {
          role: 'user',
          content: prompt.user,
        },
      ],
    };

    const headers = {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(this.apiUrl, body, {
        headers,
        timeout: 60000,
      });

      const content = response.data.choices?.[0]?.message?.content;

      if (!content) {
        this.logger.warn('No content in response');
        return 'Nuk u gjet përgjigje.';
      }

      return content;
    } catch (error: any) {
      this.logger.error(`Request error: ${error.message}`);
      throw error;
    }
  }
}