import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FinanceService } from '../services/finance.service';

@Controller('finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Post()
    create(@Body() data: any) {
        return this.financeService.create(data);
    }

    @Get()
    findAll() {
        return this.financeService.findAll();
    }

    @Get('summary')
    getSummary() {
        return this.financeService.getSummary();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.financeService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.financeService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.financeService.delete(id);
    }
}
