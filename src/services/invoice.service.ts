import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AiService } from "src/services/ai.service";
import { ClientService } from "src/services/client.service";

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel("Invoice") private readonly invoiceModel: Model<any>,
    private readonly aiService: AiService,
    private readonly clientService: ClientService
  ) { }

  async createFromAi(prompt: string, history: any[], company: any) {
    try {
      if (company.type !== "COMPANY") {
        throw new ForbiddenException();
      }

      const aiResponse = await this.aiService.generateInvoice(prompt, history);

      if (aiResponse.type === 'question') {
        return {
          action: 'question',
          message: aiResponse.message,
        };
      }

      if (aiResponse.type === 'invoice' && aiResponse.data) {
        const invoice = await this.invoiceModel.create({
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
      console.log({ error });
      throw new Error("AI response format was not recognized");
    }
  }

  async create(data: any, company: any) {
    const companyId = data.company_id || company?._id || company?.id;

    if (data.client_name) {
      try {
        await this.clientService.create({
          name: data.client_name,
          email: data.client_email,
          address: data.client_address,
          company_id: companyId
        }, company);
      } catch (err) {
        console.error("Failed to create/update client inline", err);
      }
    }

    const invoice = await this.invoiceModel.create({
      ...data,
      invoice_number: data.invoice_number || `INV-${Date.now()}`,
      company_id: companyId,
      status: data.status || 'DRAFT'
    });

    return invoice;
  }

  async update(id: string, data: any, company?: any) {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    if (data.client_name) {
      try {
        await this.clientService.create({
          name: data.client_name,
          email: data.client_email,
          address: data.client_address,
          company_id: invoice.company_id
        }, company);
      } catch (err) {
        console.error("Failed to create/update client inline", err);
      }
    }

    const { _id, createdAt, updatedAt, __v, ...updateData } = data;

    const updatedInvoice = await this.invoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return updatedInvoice;
  }

  async editWithAi(id: string, prompt: string, company: any) {
    const invoice = await this.invoiceModel.findById(id);

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
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    await invoice.deleteOne();
    return { success: true };
  }

  async getAll(company: any) {
    if (!company?._id) {
      return [];
    }
    return this.invoiceModel.find({ company_id: company._id }).sort({ createdAt: -1 });
  }

  async getAllByCompanyId(companyId: string) {
    return this.invoiceModel.find({ company_id: companyId }).sort({ createdAt: -1 });
  }

  async getById(id: string, company: any) {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException();
    }

    return invoice;
  }
}
