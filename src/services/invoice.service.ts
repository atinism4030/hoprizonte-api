import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InvoiceModel } from "src/models/Invoice.model";
import { AiService } from "src/services/ai.service";

@Injectable()
export class InvoiceService {
  constructor(private readonly aiService: AiService) {}

async createFromAi(prompt: string, history: any[], company: any) {
    try {
      if (company.type !== "COMPANY") {
        throw new ForbiddenException();
      }

      const aiResponse = await this.aiService.generateInvoice(prompt, history);
      console.log({aiResponse});
      
      if (aiResponse.type === 'question') {
        return {
          action: 'question',
          message: aiResponse.message,
        };
      }

      if (aiResponse.type === 'invoice' && aiResponse.data) {
        const invoice = await InvoiceModel.create({
          ...aiResponse.data,
          invoice_number: `INV-${Date.now()}`,
          company_id: company._id,
        });

        return {
          action: 'created',
          invoice: invoice
        };
      }
    } catch (error) {
      console.log({error});
      throw new Error("AI response format was not recognized");
    }
  }

  async editWithAi(id: string, prompt: string, company: any) {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    if (invoice.company_id.toString() !== company._id.toString()) {
      throw new ForbiddenException();
    }

    const aiInvoice = await this.aiService.generateInvoice(prompt);

    Object.assign(invoice, aiInvoice);
    await invoice.save();

    return invoice;
  }

  async delete(id: string, company: any) {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    if (invoice.company_id.toString() !== company._id.toString()) {
      throw new ForbiddenException();
    }

    await invoice.deleteOne();
    return { success: true };
  }

  async getAll(company: any) {
    return InvoiceModel.find({ company_id: company._id }).sort({ createdAt: -1 });
  }

  async getById(id: string, company: any) {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    if (invoice.company_id.toString() !== company._id.toString()) {
      throw new ForbiddenException();
    }

    return invoice;
  }
}
