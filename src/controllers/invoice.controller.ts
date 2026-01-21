import { Controller, Post, Body, Req, Get, Param, Delete, Put, Query } from "@nestjs/common";
import { CreateInvoiceAiDto, EditInvoiceAiDto } from "src/DTO/invoice.dto";
import { InvoiceService } from "src/services/invoice.service";
import { EmailService } from "src/services/email.service";

@Controller("invoices")
export class InvoiceController {
    constructor(
        private readonly invoiceService: InvoiceService,
        private readonly emailService: EmailService
    ) { }

    @Get("dashboard-url")
    getDashboardUrl() {
        return {
            url: "https://invoice.horizonte.mk",
            message: "Invoice Dashboard URL"
        };
    }

    @Post()
    async create(@Body() body: any, @Req() req) {
        return this.invoiceService.create(body, req.user);
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() body: any, @Req() req) {
        return this.invoiceService.update(id, body, req.user);
    }

    @Post("ai")
    async createInvoice(@Body() dto: CreateInvoiceAiDto) {
        return this.invoiceService.createFromAi(dto.prompt, dto.history || [], dto.user.company);
    }

    @Put(":id/ai")
    async editInvoice(@Param("id") id: string, @Body() dto: EditInvoiceAiDto, @Req() req) {
        return this.invoiceService.editWithAi(id, dto.prompt, req.user);
    }

    @Post("send-email")
    async sendEmail(@Body() body: {
        to: string;
        subject: string;
        body: string;
        pdfBase64: string;
        invoiceNumber?: string;
        language?: string;
    }) {
        const result = await this.emailService.sendInvoiceEmail(
            body.to,
            body.subject,
            body.body,
            body.pdfBase64,
            body.invoiceNumber || 'draft',
            body.language || 'sq'
        );

        if (!result.success) {
            return { success: false, message: result.message };
        }

        return { success: true, message: result.message };
    }

    @Delete(":id")
    async deleteInvoice(@Param("id") id: string, @Req() req) {
        return this.invoiceService.delete(id, req.user);
    }

    @Get()
    async getAll(@Query("company_id") companyId: string, @Req() req) {
        if (companyId) {
            return this.invoiceService.getAllByCompanyId(companyId);
        }
        return this.invoiceService.getAll(req.user);
    }

    @Get(":id")
    async getById(@Param("id") id: string, @Req() req) {
        return this.invoiceService.getById(id, req.user);
    }
}
