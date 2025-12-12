import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Observable } from 'rxjs';

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
        timeout: 600000,
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

  generateStream(prompt: Prompt): Observable<any> {
    return new Observable((observer) => {
      const body = {
        model: 'mistral-large-latest',
        stream: true,
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

      axios
        .post(this.apiUrl, body, {
          headers,
          responseType: 'stream',
          timeout: 600000,
        })
        .then((response) => {
          const stream = response.data;

          stream.on('data', (chunk: Buffer) => {
            const lines = chunk
              .toString()
              .split('\n')
              .filter((line) => line.trim() !== '');

            for (const line of lines) {
              if (line.includes('[DONE]')) {
                observer.complete();
                return;
              }

              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.replace('data: ', '');
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    observer.next({ data: content });
                  }
                } catch (e) {
                  // ignore parse errors for partial chunks
                }
              }
            }
          });

          stream.on('end', () => {
            observer.complete();
          });

          stream.on('error', (err: any) => {
            observer.error(err);
          });
        })
        .catch((err) => {
          observer.error(err);
        });
    });
  }
}