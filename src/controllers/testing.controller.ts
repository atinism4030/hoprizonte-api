import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateAccountDTO } from 'src/DTO/account.dto';
import { AccountService } from 'src/services/account.service';
import { TestingService } from 'src/services/testing.service';
import { ApiResponse } from 'src/types/api-response.types';

@Controller('testing')
export class TestingController {

    constructor(private readonly testingService: TestingService) {}
  
    @Post("/insert-bulk-companies")
    async createCompanyAccount(@Body() data: CreateAccountDTO[]): Promise<ApiResponse> {
        const response = await this.testingService.insertBulkAccounts(data);

        return {
            message:"Insert bulk accounts",
            data: response
        }
    }

}
