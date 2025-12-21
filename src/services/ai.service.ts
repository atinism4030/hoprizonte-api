import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Observable } from 'rxjs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Prompt {
  system: string;
  user: string;
  history?: ChatMessage[];
}

const SECTION_ORDER = ['project', 'phases', 'text_response'];

const SECTION_STATUS_MESSAGES: Record<string, string> = {
  project: 'Duke analizuar projektin tuaj...',
  phases: 'Duke krijuar fazat dhe punët e detajuara...',
  text_response: '',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl = 'https://api.mistral.ai/v1/chat/completions';

  async generate(prompt: Prompt): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: prompt.system },
      ...(prompt.history || []),
      { role: 'user', content: prompt.user },
    ];

    const body = {
      model: 'mistral-large-latest',
      stream: false,
      messages,
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
      const messages: ChatMessage[] = [
        { role: 'system', content: prompt.system },
        ...(prompt.history || []),
        { role: 'user', content: prompt.user },
      ];

      const body = {
        model: 'mistral-large-latest',
        stream: true,
        messages,
      };

      const headers = {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      };

      let fullContent = '';
      const emittedSections = new Set<string>();
      let emittedPhaseCount = 0;

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
                this.emitRemainingSections(fullContent, emittedSections, emittedPhaseCount, observer);
                observer.next({
                  type: 'complete',
                  fullContent: fullContent,
                });
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

                    const cleanedContent = this.cleanJsonContent(fullContent);

                    if (!emittedSections.has('project')) {
                      const projectComplete = this.isSectionComplete(cleanedContent, 'project');
                      if (projectComplete) {
                        const projectData = this.extractSection(cleanedContent, 'project');
                        if (projectData !== null) {
                          emittedSections.add('project');
                          observer.next({
                            type: 'section',
                            section: 'project',
                            data: projectData,
                            nextStatus: 'Duke krijuar fazën 1...',
                          });
                        }
                      }
                    }

                    const newPhases = this.extractIndividualPhases(cleanedContent, emittedPhaseCount);
                    for (const phase of newPhases) {
                      emittedPhaseCount++;
                      observer.next({
                        type: 'phase',
                        phaseIndex: phase.id || emittedPhaseCount,
                        data: phase,
                        nextStatus: emittedPhaseCount < 4 ? `Duke krijuar fazën ${emittedPhaseCount + 1}...` : 'Duke përfunduar...',
                      });
                    }

                    if (!emittedSections.has('text_response')) {
                      const textComplete = this.isSectionComplete(cleanedContent, 'text_response');
                      if (textComplete) {
                        const textData = this.extractSection(cleanedContent, 'text_response');
                        if (textData !== null) {
                          emittedSections.add('text_response');
                          observer.next({
                            type: 'section',
                            section: 'text_response',
                            data: textData,
                            nextStatus: '',
                          });
                        }
                      }
                    }
                  }
                } catch (e) { }
              }
            }
          });

          stream.on('end', () => {
            this.emitRemainingSections(fullContent, emittedSections, emittedPhaseCount, observer);
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

  private extractIndividualPhases(content: string, alreadyEmittedCount: number): any[] {
    const phases: any[] = [];

    try {
      const phasesPattern = '"phases"';
      const phasesStart = content.indexOf(phasesPattern);
      if (phasesStart === -1) return phases;

      const colonIndex = content.indexOf(':', phasesStart + phasesPattern.length);
      if (colonIndex === -1) return phases;

      let arrayStart = colonIndex + 1;
      while (arrayStart < content.length && /\s/.test(content[arrayStart])) {
        arrayStart++;
      }

      if (content[arrayStart] !== '[') return phases;

      let depth = 0;
      let inString = false;
      let objectStart = -1;
      let phaseIndex = 0;

      for (let i = arrayStart; i < content.length; i++) {
        const char = content[i];

        if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') {
          if (depth === 1) {
            objectStart = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 1 && objectStart !== -1) {
            phaseIndex++;
            if (phaseIndex > alreadyEmittedCount) {
              const phaseStr = content.substring(objectStart, i + 1);
              try {
                const phase = JSON.parse(phaseStr);
                phases.push(phase);
              } catch (e) { }
            }
            objectStart = -1;
          }
        } else if (char === '[') {
          depth++;
        } else if (char === ']') {
          depth--;
          if (depth === 0) {
            break;
          }
        }
      }
    } catch (e) {
      this.logger.error(`Error extracting individual phases: ${e}`);
    }

    return phases;
  }

  private emitRemainingSections(
    fullContent: string,
    emittedSections: Set<string>,
    emittedPhaseCount: number,
    observer: any
  ): void {
    const cleanedContent = this.cleanJsonContent(fullContent);

    try {
      const parsed = JSON.parse(cleanedContent);

      if (!emittedSections.has('project') && parsed.project) {
        emittedSections.add('project');
        observer.next({
          type: 'section',
          section: 'project',
          data: parsed.project,
          nextStatus: '',
        });
      }

      if (parsed.phases && Array.isArray(parsed.phases)) {
        for (let i = emittedPhaseCount; i < parsed.phases.length; i++) {
          observer.next({
            type: 'phase',
            phaseIndex: parsed.phases[i].id || i + 1,
            data: parsed.phases[i],
            nextStatus: '',
          });
        }
      }

      if (!emittedSections.has('text_response') && parsed.text_response) {
        emittedSections.add('text_response');
        observer.next({
          type: 'section',
          section: 'text_response',
          data: parsed.text_response,
          nextStatus: '',
        });
      }
    } catch (e) {
      if (!emittedSections.has('text_response')) {
        const textData = this.extractSection(cleanedContent, 'text_response');
        if (textData !== null) {
          emittedSections.add('text_response');
          observer.next({
            type: 'section',
            section: 'text_response',
            data: textData,
            nextStatus: '',
          });
        }
      }
    }
  }

  private cleanJsonContent(content: string): string {
    let cleaned = content.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    return cleaned.trim();
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
      this.logger.error(`Error extracting section ${sectionKey}: ${e}`);
      return null;
    }
  }
}