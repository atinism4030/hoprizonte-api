import { Controller, Post, Body, Req, Get, Param, Delete, Put, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from "@nestjs/swagger";
import { CreateInvoiceAiDto, EditInvoiceAiDto } from "src/DTO/invoice.dto";
import { InvoiceService } from "src/services/invoice.service";

@ApiTags('Invoice')
@Controller("invoices")
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    async create(@Body() body: any, @Req() req) {
        return this.invoiceService.create(body, req.user);
    }

    @Put(":id")
    @ApiOperation({ summary: 'Update an invoice' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
    async update(@Param("id") id: string, @Body() body: any, @Req() req) {
        return this.invoiceService.update(id, body, req.user);
    }

    @Post("ai")
    @ApiOperation({ summary: 'Create invoice using AI' })
    @ApiBody({ type: CreateInvoiceAiDto })
    @ApiResponse({ status: 201, description: 'AI invoice created successfully' })
    async createInvoice(@Body() dto: CreateInvoiceAiDto) {
        return this.invoiceService.createFromAi(dto.prompt, dto.history || [], dto.user.company);
    }

    @Put(":id/ai")
    @ApiOperation({ summary: 'Edit invoice using AI' })
    @ApiBody({ type: EditInvoiceAiDto })
    @ApiResponse({ status: 200, description: 'Invoice edited successfully' })
    async editInvoice(@Param("id") id: string, @Body() dto: EditInvoiceAiDto, @Req() req) {
        return this.invoiceService.editWithAi(id, dto.prompt, req.user);
    }

    @Delete(":id")
    @ApiOperation({ summary: 'Delete invoice' })
    @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
    async deleteInvoice(@Param("id") id: string, @Req() req) {
        return this.invoiceService.delete(id, req.user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all invoices' })
    @ApiQuery({ name: 'company_id', required: false, description: 'Filter by company ID' })
    @ApiResponse({ status: 200, description: 'List of invoices' })
    async getAll(@Query("company_id") companyId: string, @Req() req) {
        if (companyId) {
            return this.invoiceService.getAllByCompanyId(companyId);
        }
        return this.invoiceService.getAll(req.user);
    }

    @Get(":id")
    @ApiOperation({ summary: 'Get invoice by id' })
    @ApiResponse({ status: 200, description: 'Invoice details' })
    async getById(@Param("id") id: string, @Req() req) {
        return this.invoiceService.getById(id, req.user);
    }
}
