import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Observable } from 'rxjs';

interface Prompt {
  system: string;
  user: string;
}

const SECTION_ORDER = [
  'project',
  'phases',
  'tasks',
  'materials_summary',
  'risk_analysis',
  'budget_tips',
  'recommended_companies',
  'text_response',
];

const SECTION_STATUS_MESSAGES: Record<string, string> = {
  project: 'Duke definuar fazat e punës...',
  phases: 'Duke detajuar detyrat teknike...',
  tasks: 'Duke llogaritur materialet...',
  materials_summary: 'Duke analizuar rreziqet...',
  risk_analysis: 'Duke përgatitur rekomandimet...',
  budget_tips: 'Duke gjetur kompanitë partnere...', 
  recommended_companies: 'Duke finalizuar...',      
  text_response: '',
};

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

      let fullContent = '';
      const emittedSections = new Set<string>();

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
                if (fullContent.trim()) {
                  observer.next({
                    type: 'complete',
                    fullContent: fullContent,
                  });
                }
                observer.complete();
                return;
              }

              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.replace('data: ', '');
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;

                    for (const sectionKey of SECTION_ORDER) {
                      if (emittedSections.has(sectionKey)) continue;

                      const sectionComplete = this.isSectionComplete(
                        fullContent,
                        sectionKey,
                      );
                      if (sectionComplete) {
                        const sectionData = this.extractSection(
                          fullContent,
                          sectionKey,
                        );
                        if (sectionData !== null) {
                          emittedSections.add(sectionKey);

                          const nextStatus =
                            SECTION_STATUS_MESSAGES[sectionKey] || '';

                          observer.next({
                            type: 'section',
                            section: sectionKey,
                            data: sectionData,
                            nextStatus: nextStatus,
                          });
                        }
                      }
                    }
                  }
                } catch (e) {
                }
              }
            }
          });

          stream.on('end', () => {
            observer.next({
              type: 'complete',
              fullContent: fullContent,
            });
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

  private isSectionComplete(content: string, sectionKey: string): boolean {
    const pattern = `"${sectionKey}"`;
    const startIndex = content.indexOf(pattern);
    if (startIndex === -1) return false;

    const colonIndex = content.indexOf(':', startIndex + pattern.length);
    if (colonIndex === -1) return false;

    let valueStart = colonIndex + 1;
    while (valueStart < content.length && /\s/.test(content[valueStart])) {
      valueStart++;
    }

    if (valueStart >= content.length) return false;

    const firstChar = content[valueStart];

    if (sectionKey === 'text_response') {
      if (firstChar !== '"') return false;
      let i = valueStart + 1;
      while (i < content.length) {
        if (content[i] === '"' && content[i - 1] !== '\\') {
          return true;
        }
        i++;
      }
      return false;
    }

    const openChar = firstChar;
    const closeChar = openChar === '{' ? '}' : openChar === '[' ? ']' : null;
    if (!closeChar) return false;

    let depth = 0;
    let inString = false;

    for (let i = valueStart; i < content.length; i++) {
      const char = content[i];

      if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          return true;
        }
      }
    }

    return false;
  }


  private extractSection(content: string, sectionKey: string): any {
    try {
      const pattern = `"${sectionKey}"`;
      const startIndex = content.indexOf(pattern);
      if (startIndex === -1) return null;

      const colonIndex = content.indexOf(':', startIndex + pattern.length);
      if (colonIndex === -1) return null;

      let valueStart = colonIndex + 1;
      while (valueStart < content.length && /\s/.test(content[valueStart])) {
        valueStart++;
      }

      const firstChar = content[valueStart];

      if (sectionKey === 'text_response') {
        if (firstChar !== '"') return null;
        let i = valueStart + 1;
        while (i < content.length) {
          if (content[i] === '"' && content[i - 1] !== '\\') {
            const strValue = content.substring(valueStart, i + 1);
            return JSON.parse(strValue);
          }
          i++;
        }
        return null;
      }

      const openChar = firstChar;
      const closeChar = openChar === '{' ? '}' : openChar === '[' ? ']' : null;
      if (!closeChar) return null;

      let depth = 0;
      let inString = false;

      for (let i = valueStart; i < content.length; i++) {
        const char = content[i];

        if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{' || char === '[') {
          depth++;
        } else if (char === '}' || char === ']') {
          depth--;
          if (depth === 0) {
            const valueStr = content.substring(valueStart, i + 1);
            return JSON.parse(valueStr);
          }
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}