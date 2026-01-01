import { Controller, Get, Post, Body, Req, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { ClientService } from "src/services/client.service";

@ApiTags('Client')
@Controller("clients")
export class ClientController {
    constructor(private readonly clientService: ClientService) { }

    @Get("search")
    @ApiOperation({ summary: 'Search clients by name' })
    @ApiQuery({ name: 'query', description: 'Search query' })
    @ApiQuery({ name: 'company_id', description: 'Company ID', required: false })
    @ApiResponse({ status: 200, description: 'List of matching clients' })
    async search(@Query("query") query: string, @Query("company_id") companyId: string, @Req() req) {
        const company = companyId ? { _id: companyId } : req.user;
        return this.clientService.search(query, company);
    }

    @Get()
    @ApiOperation({ summary: 'Get all clients' })
    @ApiQuery({ name: 'company_id', description: 'Company ID', required: false })
    @ApiResponse({ status: 200, description: 'List of clients' })
    async getAll(@Query("company_id") companyId: string, @Req() req) {
        const company = companyId ? { _id: companyId } : req.user;
        return this.clientService.getAll(company);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new client' })
    @ApiResponse({ status: 201, description: 'Client created successfully' })
    async create(@Body() body: any, @Req() req) {
        return this.clientService.create(body, req.user);
    }
}
