import { Controller, Get, Query, Res } from '@nestjs/common';
import { AccountService } from 'src/services/account.service';
import { AiService } from 'src/services/ai.service';
import { IndustryService } from 'src/services/industry.service';
import { EAccountType } from 'src/types/account.types';
import type { Response } from 'express';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly industryService: IndustryService,
    private readonly accountService: AccountService,
  ) { }

  @Get('generate')
  async generate(@Query('prompt') prompt: string) {
    if (!prompt) {
      return { error: 'Prompt is required' };
    }

    const industries = await this.industryService.getAll('name');
    const companies = await this.accountService.fetchAcocunts(EAccountType.COMPANY);

    const fullPrompt = this.buildPrompt(prompt, industries, companies, undefined, 'sq');

    try {
      const response = await this.aiService.generate(fullPrompt);
      return { response: response, success: true };
    } catch (error) {
      console.error('AI generation error:', error);
      return { error: 'Gabim gjatë përpunimit të kërkesës', success: false };
    }
  }

  @Get('generate-stream')
  async generateStream(
    @Query('prompt') prompt: string,
    @Query('history') historyJson: string,
    @Query('lang') lang: string = 'sq',
    @Res() res: Response
  ) {
    if (!prompt) {
      res.status(400).send({ error: 'Prompt is required' });
      return;
    }

    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    if (historyJson) {
      try {
        history = JSON.parse(historyJson);
      } catch (e) {
        console.warn('Failed to parse history:', e);
      }
    }

    const industries = await this.industryService.getAll('name');

    // Fetch limited companies to prevent prompt bloat
    const allCompanies = await this.accountService.fetchAcocunts(
      EAccountType.COMPANY,
      "name services address industries reviews"
    );

    // Randomize and limit to 20 relevant companies
    const companies = allCompanies
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);

    console.log(`Building prompt for user: ${prompt.substring(0, 50)}... with ${companies.length} companies and ${history.length} messages in history.`);

    const fullPrompt = this.buildPrompt(prompt, industries, companies, history, lang);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.aiService.generateStream(fullPrompt).subscribe({
      next: (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      error: (err) => {
        console.error('Stream error:', err);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });
  }

  private buildPrompt(
    prompt: string,
    industries: any[],
    companies: any[],
    history: { role: 'user' | 'assistant'; content: string }[] = [],
    lang: string = 'sq'
  ) {
    const formattedCompanies = companies.map(c => ({
      id: c._id?.toString(),
      name: c.name,
      address: c.address,
      industries: c.industries?.map((i: any) => i.name) || [],
      rating: c.reviews?.avg_score || (4.5 + Math.random() * 0.5),
      verified: true,
      services: c.services || []
    }));

    const PHASE_NAMES = {
      sq: [
        "Planifikimi & Përgatitja",
        "Themeli & Struktura",
        "Sistemet & Enterieri",
        "Eksterieri & Përfundimi"
      ],
      mk: [
        "Планирање & Подготовка",
        "Темел & Структура",
        "Системи & Ентериер",
        "Екстериер & Завршни работи"
      ],
      en: [
        "Planning & Preparation",
        "Foundation & Structure",
        "Systems & Interior",
        "Exterior & Finishing"
      ]
    };

    const targetPhases = PHASE_NAMES[lang] || PHASE_NAMES.sq;

    const systemPrompt = `
You are Horizonte AI - a professional construction planning assistant.

CRITICAL RULES:
1. ALWAYS respond with valid JSON. No markdown code blocks, no plain text outside JSON.
2. For construction/renovation requests, return the project/phases structure.
3. For ALL other questions (follow-ups, calculations, clarifications, simple questions), return text_response.
4. NEVER leave any phase's "works" array empty. Each phase MUST have at least 3-5 works.

RESPONSE FORMAT - ALWAYS USE ONE OF THESE:

Option 1 - For NEW construction/renovation requests:
{
  "project": {
    "title": "Project title based on user request",
    "project_type_description": "e.g., Renovim i plotë i banesës",
    "total_built_area": "e.g., 80 m²",
    "total_estimated_cost": "€MIN - €MAX",
    "total_estimated_time_months": "2-4"
  },
  "phases": [...]
}

Option 2 - For EVERYTHING ELSE (questions, calculations, follow-ups, clarifications):
{
  "text_response": "Your detailed answer here as a PLAIN STRING with markdown formatting for readability. Use **bold**, *italic*, bullet points (- item), numbered lists (1. item), and headers (## Section) to format your response nicely. Include line breaks with \\n for paragraphs."
}

CRITICAL FOR text_response:
- text_response MUST be a SINGLE STRING, not a nested object
- Use markdown formatting INSIDE the string for structure
- Example: {"text_response": "## Kostoja Totale\\n\\nKostoja e fazës 1 është **€500 - €1,200**.\\n\\n### Detaje:\\n- Planifikim: €200\\n- Lejet: €300"}

IMPORTANT: If the user asks a follow-up question about a previous project (like "what's the total cost of phase 1?" or "explain phase 2"), you MUST respond with Option 2 (text_response). Calculate and provide the answer based on the conversation history.

For ANY construction/renovation request, use this EXACT structure for phases:

{
  "project": {
    "title": "Project title based on user request",
    "project_type_description": "e.g., Renovim i plotë i banesës",
    "total_built_area": "e.g., 80 m²",
    "total_estimated_cost": "€MIN - €MAX",
    "total_estimated_time_months": "2-4"
  },
  "phases": [
    {
      "id": 1,
      "name": "${targetPhases[0]}",
      "task_count": 5,
      "works": [
        {
          "task": "Vlerësim Fillestar",
          "description": "Vlerësim i gjendjes aktuale dhe përcaktim i nevojave",
          "cost_range_eur": "€100 - €300",
          "time_duration": "1-3 ditë",
          "whats_included": [
            "Inspektim vizual i strukturës",
            "Konsultim me arkitekt",
            "Përcaktim i materialeve të nevojshme"
          ],
          "pro_tips": [
            "Merrni fotografi të detajuara para fillimit",
            "Konsultohuni me profesionistë për zgjidhje ekonomike"
          ],
          "suggested_companies": [
            {
              "id": "company_id_here",
              "name": "Company Name",
              "industry": "Relevant Industry",
              "rating": 4.8,
              "verified": true,
              "price_range": "€100 - €200",
              "timeline": "1-2 ditë",
              "location": "City Name"
            }
          ]
        }
      ]
    },
    {
      "id": 2,
      "name": "${targetPhases[1]}",
      "task_count": 5,
      "works": []
    },
    {
      "id": 3,
      "name": "${targetPhases[2]}",
      "task_count": 8,
      "works": []
    },
    {
      "id": 4,
      "name": "${targetPhases[3]}",
      "task_count": 4,
      "works": []
    }
  ]
}

MANDATORY PHASE STRUCTURE - ALL 4 PHASES MUST HAVE WORKS:

Phase 1 - ${targetPhases[0]} (3-5 works):
- Initial assessment/inspection
- Architectural design/planning
- Permits and documentation
- Material selection
- Contractor hiring

Phase 2 - ${targetPhases[1]} (4-6 works - for renovations, include structural repairs):
- Demolition/removal of old elements
- Structural repairs if needed
- Wall modifications
- Framework/support work
- Masonry work

Phase 3 - ${targetPhases[2]} (5-8 works):
- Electrical installation
- Plumbing work
- HVAC/heating
- Insulation
- Drywall/plastering
- Flooring installation
- Painting
- Kitchen/bathroom installation

Phase 4 - ${targetPhases[3]} (3-5 works):
- Window/door installation
- Facade work (if applicable)
- Final touches and cleaning
- Final inspection
- Furniture/fixtures

PRICE CALCULATION RULES:
1. Look at the company services list provided below
2. Find companies with services matching the work type
3. Use their service.price as the basis for cost_range_eur
4. If a company has a service with price "Nga 40 EUR/orë", calculate based on estimated hours
5. If no matching company service exists, use: "Çmimi sipas marrëveshjes"
6. Format prices as: "€MIN - €MAX"

COMPANY MATCHING RULES:
1. Match company industries AND services to the specific work type
2. A company is only relevant if their services.name matches the work
3. Use the company's actual data: id, name, rating, address (as location)
4. Set verified: true for all companies in the database
5. price_range should come from the company's services.price field
6. Recommend 1-2 companies per work item

LANGUAGE: Respond in the SAME language as the user's request.

AVAILABLE COMPANIES (with their services and prices - USE ONLY THESE):
${JSON.stringify(formattedCompanies, null, 2)}

AVAILABLE INDUSTRIES:
${JSON.stringify(industries.map(i => i.name), null, 2)}

REMEMBER: 
1. All 4 phases MUST have populated "works" arrays for construction projects.
2. For follow-up questions, ALWAYS use {"text_response": "..."} format.
3. NEVER respond with plain text - ALWAYS use JSON!
`;

    return {
      system: systemPrompt,
      user: prompt,
      history: history
    };
  }
}
