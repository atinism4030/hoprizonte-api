import { Controller, Post, Body, Req, Get, Param, Delete, Put } from "@nestjs/common";
import { CreateInvoiceAiDto, EditInvoiceAiDto } from "src/DTO/invoice.dto";
import { InvoiceService } from "src/services/invoice.service";

@Controller("invoices")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

    @Post("ai")
    createInvoice(@Body() dto: CreateInvoiceAiDto) {
        return this.invoiceService.createFromAi(dto.prompt, dto.history || [], dto.user.company);
    }

    @Put(":id/ai")
    editInvoice(@Param("id") id: string, @Body() dto: EditInvoiceAiDto, @Req() req) {
        return this.invoiceService.editWithAi(id, dto.prompt, req.user);
    }

    @Delete(":id")
    deleteInvoice(@Param("id") id: string, @Req() req) {
        return this.invoiceService.delete(id, req.user);
    }

    @Get()
    getAll(@Req() req) {
        return this.invoiceService.getAll(req.user);
    }

    @Get(":id")
    getById(@Param("id") id: string, @Req() req) {
        return this.invoiceService.getById(id, req.user);
    }
}
