import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }


  async generate(prompt: Prompt): Promise<string> {
    const fullPrompt = prompt.system + '\n\n' +
      (prompt.history?.map(m => `${m.role}: ${m.content}`).join('\n') || '') +
      '\n\nUser: ' + prompt.user;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      });

      const response = result.response;
      const content = response.text();

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
      const fullPrompt = prompt.system + '\n\n' +
        (prompt.history?.slice(-10)?.map(m => `${m.role}: ${m.content}`).join('\n') || '') +
        '\n\nUser: ' + prompt.user;

      let fullContent = '';
      const emittedSections = new Set<string>();
      let emittedPhaseCount = 0;

      const runStream = async () => {
        try {
          const result = await this.model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8000,
            },
          });

          for await (const chunk of result.stream) {
            const content = chunk.text();
            if (content) {
              fullContent += content;

              const cleanedContent = this.cleanJsonContent(fullContent);

              // Try to emit project section
              if (!emittedSections.has('project')) {
                if (this.isSectionComplete(cleanedContent, 'project')) {
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

              // Try to emit new phases
              const newPhases = this.extractIndividualPhases(
                cleanedContent,
                emittedPhaseCount,
              );

              for (const phase of newPhases) {
                emittedPhaseCount++;
                observer.next({
                  type: 'phase',
                  phaseIndex: phase.id || emittedPhaseCount,
                  data: phase,
                  nextStatus:
                    emittedPhaseCount < 4
                      ? `Duke krijuar fazën ${emittedPhaseCount + 1}...`
                      : 'Duke përfunduar...',
                });
              }

              // Try to emit text_response
              if (!emittedSections.has('text_response')) {
                if (this.isSectionComplete(cleanedContent, 'text_response')) {
                  const textData = this.extractSection(
                    cleanedContent,
                    'text_response',
                  );
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
          }

          // Stream finished
          const estimatedTokens = Math.ceil(fullContent.length / 4);
          this.logger.log(`TOKENS_STREAM_ESTIMATED=${estimatedTokens}`);

          this.emitRemainingSections(
            fullContent,
            emittedSections,
            emittedPhaseCount,
            observer,
          );

          observer.next({
            type: 'complete',
            fullContent,
            estimatedTokens,
          });
          observer.complete();
        } catch (err: any) {
          this.logger.error(`Stream error: ${err.message}`);
          observer.error(err);
        }
      };

      runStream();
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
    this.logger.log(`emitRemainingSections called. Content length: ${fullContent?.length || 0}`);
    this.logger.log(`Already emitted: project=${emittedSections.has('project')}, text_response=${emittedSections.has('text_response')}, phases=${emittedPhaseCount}`);

    if (!fullContent || fullContent.trim().length === 0) {
      this.logger.warn('No content received from AI');
      if (!emittedSections.has('text_response')) {
        emittedSections.add('text_response');
        observer.next({
          type: 'section',
          section: 'text_response',
          data: 'Ju lutem provoni përsëri. Sistemi nuk mori përgjigje.',
          nextStatus: '',
        });
      }
      return;
    }

    const cleanedContent = this.cleanJsonContent(fullContent);
    this.logger.log(`Cleaned content (first 200 chars): ${cleanedContent.substring(0, 200)}`);

    let parsed: any = null;
    let parseSuccess = false;

    try {
      parsed = JSON.parse(cleanedContent);
      parseSuccess = true;
      this.logger.log(`JSON parse successful. Keys: ${Object.keys(parsed).join(', ')}`);
    } catch (e) {
      this.logger.warn(`JSON parse failed: ${e.message}`);

      // If JSON parse fails, maybe we can still extract some phases manually
      const remainingPhases = this.extractIndividualPhases(cleanedContent, emittedPhaseCount);
      for (const phase of remainingPhases) {
        emittedPhaseCount++;
        observer.next({
          type: 'phase',
          phaseIndex: phase.id || emittedPhaseCount,
          data: phase,
          nextStatus: '',
        });
        this.logger.log(`Emitted phase ${emittedPhaseCount} via manual extraction fallback`);
      }
    }

    if (parseSuccess && parsed) {
      if (!emittedSections.has('project') && parsed.project) {
        emittedSections.add('project');
        observer.next({
          type: 'section',
          section: 'project',
          data: parsed.project,
          nextStatus: '',
        });
        this.logger.log('Emitted project section');
      }

      if (parsed.phases && Array.isArray(parsed.phases)) {
        for (let i = emittedPhaseCount; i < parsed.phases.length; i++) {
          observer.next({
            type: 'phase',
            phaseIndex: parsed.phases[i].id || i + 1,
            data: parsed.phases[i],
            nextStatus: '',
          });
          this.logger.log(`Emitted phase ${i + 1}`);
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
        this.logger.log('Emitted text_response from parsed JSON');
        return;
      }
    }

    // Final fallback: if no text response was emitted, try to extract it or just send the cleaned content
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
        this.logger.log('Emitted text_response via extraction fallback');
      } else if (!emittedSections.has('project') && emittedPhaseCount === 0) {
        // Only send full content if we literally emitted NOTHING else
        emittedSections.add('text_response');
        const fallbackContent = cleanedContent.trim();
        this.logger.log(`Emitting raw content as fallback. Length: ${fallbackContent.length}`);
        observer.next({
          type: 'section',
          section: 'text_response',
          data: fallbackContent,
          nextStatus: '',
        });
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

  async generateInvoice(userPrompt: string, history: ChatMessage[] = []): Promise<any> {
    const systemPrompt = `
    You are an AI assistant that creates professional construction invoices.

    Rules:
    - ONLY return valid JSON
    - NO explanations
    - NO markdown
    - NO comments
    - Currency is MKD default, but if its not specified by the user please ask them
    - Prices must be the one that the user tells in their prompt
    - If data is missing, ask the user again for things that are missing or you dont understand

    JSON FORMAT:
    {
      "client_name": string,
      "client_email": string | null,
      "client_address": string | null,

      "title": string,
      "description": string,

      "items": [
        {
          "name": string,
          "quantity": string,
          "unit_price": string,
          "total_price": string
        }
      ],

      "subtotal": string,
      "tax_percent": number,
      "tax_amount": string,
      "total_amount": string,
      "advance_paid": string,
      "amount_due": string,

      "due_date": string,
      "notes": string
    }
    `.trim();

    const raw = await this.generate({
      system: systemPrompt,
      user: userPrompt,
      history: history,
    });

    const cleaned = this.cleanJsonContent(raw);

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.error(`AI JSON Parse Error: ${e.message} | Content: ${cleaned}`);
      return {
        type: 'question',
        message: cleaned
      };
    }
  }

}


