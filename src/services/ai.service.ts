import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Readable } from 'stream';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  async stream(prompt: string, onData: (chunk: string) => void) {
    const body = {
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    };

    const headers = {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(this.apiUrl, body, {
        headers,
        responseType: 'stream',
        timeout: 60000
      });

      const stream: Readable = response.data;
      let buffer = '';

      return new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => {
          const text = chunk.toString();
          buffer += text;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === '') continue;

            if (trimmed.startsWith('data: ')) {
              const data = trimmed.substring(6);

              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content !== undefined && content !== null) {
                  onData(JSON.stringify(parsed));
                }
              } catch (e) {
                this.logger.warn(`Parse error: ${e.message}`);
              }
            }
          }
        });

        stream.on('end', () => {
          if (buffer.trim()) {
            console.log({ buffer });
            const trimmed = buffer.trim();
            console.log({ trimmed });
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.substring(6);
              console.log({ data });

              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content !== undefined && content !== null) {
                    onData(JSON.stringify(parsed));
                  }
                } catch (e) {
                  this.logger.warn(`Final parse error: ${e.message}`);
                }
              }
            }
          }
          resolve();
        });

        stream.on('error', (err) => {
          this.logger.error(`Stream error: ${err.message}`);
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`Request error: ${error.message}`);
      throw error;
    }
  }
}