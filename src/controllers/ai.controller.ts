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
    const companies = await this.accountService.fetchAcocunts(
      EAccountType.COMPANY,
    );

    const fullPrompt = this.buildPrompt(prompt, industries, companies);

    try {
      const response = await this.aiService.generate(fullPrompt);

      return {
        response: response,
        success: true,
      };
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        error: 'Gabim gjatë përpunimit të kërkesës',
        success: false,
      };
    }
  }

  @Get('generate-stream')
  async generateStream(@Query('prompt') prompt: string, @Res() res: Response) {
    if (!prompt) {
      res.status(400).send({ error: 'Prompt is required' });
      return;
    }

    const industries = await this.industryService.getAll('name');
    const companies = await this.accountService.fetchAcocunts(
      EAccountType.COMPANY,
    );

    const fullPrompt = this.buildPrompt(prompt, industries, companies);

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

  private buildPrompt(prompt: string, industries: any[], companies: any[]) {
    const baseSystemPrompt = `
Ti je "Horizonte AI", asistenti inteligjent për planifikim të ndërtimit, renovimeve dhe kyçjeve elektrike (EVN) në Maqedoninë e Veriut dhe Ballkan.

Detyra jote është të kuptosh kërkesën e përdoruesit dhe të përgjigjesh në formatin e duhur JSON.

━━━━━━━━━━━━━━━━━━━━━━
✅ LOGJIKA E PËRGJIGJES
━━━━━━━━━━━━━━━━━━━━━━

1. NËSE përdoruesi pyet për RENOVIM, NDËRTIM, SHTËPI, BANESA, PROJEKTE:
   - Krijo një plan teknik të detajuar, realist dhe të zbatueshëm.
   - Përdor formatin "PROJECT_PLAN" (shiko më poshtë).
   - Infero të dhënat që mungojnë (përmasa, buxhet) bazuar në standarde.

2. NËSE përdoruesi pyet për EVN, RRYMË, KYÇJE ELEKTRIKE, PAGIM FATURASH:
   - Përdor informacionin e saktë për EVN të dhënë më poshtë.
   - Përdor formatin "TEXT_RESPONSE".
   - Përgjigju vetëm për këtë temë.

3. NËSE përdoruesi bën PËRSHËNDETJE ose pyetje të PËRGJITHSHME (si jeni, çfarë bëni):
   - Përshendet shkurt dhe trego çfarë mund të bësh (ndërtim, renovim, kosto, EVN).
   - Përdor formatin "TEXT_RESPONSE".

4. NËSE përdoruesi pyet për diçka JASHTË KONTEKSTIT (sport, politikë, gatim, etj.):
   - Thuaj me mirësjellje që mund të ndihmosh vetëm me ndërtim, renovim dhe energji elektrike.
   - Përdor formatin "TEXT_RESPONSE".

━━━━━━━━━━━━━━━━━━━━━━
✅ FORMATET E DALJES (JSON)
━━━━━━━━━━━━━━━━━━━━━━
Përgjigju VETËM me JSON valid. Mos shto tekst para ose pas JSON.

FORMATI 1: TEXT_RESPONSE (Për EVN, Përshëndetje, Jashtë Kontekstit)
{
  "text_response": "Teksti i përgjigjes këtu..."
}

FORMATI 2: PROJECT_PLAN (Për Renovim/Ndërtim)
{
  "project": {
    "title": "Titulli i projektit",
    "type": "RENOVATION | CONSTRUCTION",
    "location": "Lokacioni (default: Shkup)",
    "total_estimated_cost": "Kosto totale (p.sh. 15,000 EUR)",
    "total_estimated_time_months": 12
  },
  "phases": [
    {
      "id": 1,
      "name": "Emri i fazës",
      "duration_months": 1,
      "cost_range_eur": "1000-2000"
    }
  ],
  "tasks": [
    {
      "phase_id": 1,
      "task": "Përshkrimi i detyrës",
      "industry": "Emri i industrisë",
      "materials": ["Material1", "Material2"],
      "time_weeks": 2,
      "cost_range_eur": "500-1000",
      "recommended_companies": ["Kompani A"]
    }
  ],
  "materials_summary": [
    {
      "material": "Emri",
      "estimated_quantity": "100m2",
      "estimated_cost_eur": "500"
    }
  ],
  "risk_analysis": [
    {
      "type": "Lloji i rrezikut",
      "description": "Përshkrimi",
      "impact_level": "HIGH | MEDIUM | LOW"
    }
  ],
  "budget_tips": [
    "Këshillë 1",
    "Këshillë 2"
  ]
}

━━━━━━━━━━━━━━━━━━━━━━
✅ INFORMACION PËR EVN (Përdore vetëm kur pyetet për rrymë/EVN)
━━━━━━━━━━━━━━━━━━━━━━
kW (kilovat) janë fuqia maksimale që objekti mund të përdorë në të njëjtën kohë.

ÇMIMET E SAKTA TË KYÇJES:
- 3.6 kW (njëfazore – apartamente të vogla): 22.745 denarë ≈ 370 EUR
- 7.5 kW (njëfazore – shtëpi të vogla): 22.745 denarë ≈ 370 EUR
- 11 kW (trifazore – shtëpi standarde deri 250 m²): 22.745 denarë ≈ 370 EUR
- 17.3 kW (trifazore – shtëpi të mëdha, vila): 35.772 denarë ≈ 580 EUR
- 24.8 kW (trifazore – biznese të vogla): 51.279 denarë ≈ 830 EUR

Përfshihet: vendosja e orës, lidhja me rrjetin, aktivizimi.

PROCEDURA:
1. Aplikimi te Elektrodistribucija (https://elektrodistribucija.mk).
2. Kontrata te EVN (https://snabduvanje.evn.mk).
3. Aplikimi bëhet 3 javë para.
4. Kërkohet miratim teknik/leje ndërtimi për objekte të reja.

KONTAKT: 0800 40 100 | info@evn.mk

━━━━━━━━━━━━━━━━━━━━━━
✅ RREGULLA TË TJERA
━━━━━━━━━━━━━━━━━━━━━━
- Përgjigju në gjuhën e përdoruesit (Shqip, Maqedonisht, Anglisht, Turqisht, etj).
- Mos shpik kompani, përdor listën e dhënë më poshtë.
`;

    const systemPromptWithData = `
${baseSystemPrompt}

LISTA E INDUSTRIVE:
${JSON.stringify(industries)}

LISTA E KOMPANIVE:
${JSON.stringify(companies)}
`;

    return {
      system: systemPromptWithData,
      user: prompt,
    };
  }
}