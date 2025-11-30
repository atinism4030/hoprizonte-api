import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { type ObjectId } from 'mongoose';
import { CreateAccountDTO, LoginDTO } from 'src/DTO/account.dto';
import { AccountService } from 'src/services/account.service';
import { EAccountType } from 'src/types/account.types';

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('/create-company-account')
  @ApiOperation({ summary: 'Create a new company account' })
  @ApiBody({ type: CreateAccountDTO })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async createCompanyAccount(@Body() data: CreateAccountDTO) {
    console.log({data});
    
    const response = await this.accountService.createAccount(
      data,
      EAccountType.COMPANY,
    );
    return {
      message: 'Create company account',
      data: response,
    };
  }

  @Post('/create-user-account')
  @ApiOperation({ summary: 'Create a new company account' })
  @ApiBody({ type: CreateAccountDTO })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async createUserAccount(@Body() data: CreateAccountDTO) {
    const response = await this.accountService.createAccount(
      data,
      EAccountType.USER,
    );
    return {
      message: 'Create user account',
      data: response,
    };
  }

  @Get('/accounts')
  @ApiOperation({ summary: 'Fetch accounts by type' })
  @ApiQuery({ name: 'type', enum: EAccountType })
  async fetchAcocunts(@Query('type') type: EAccountType) {
    const response = await this.accountService.fetchAcocunts(type);
    return {
      message: `${type} accounts`,
      data: response,
    };
  }

  @Post('/login')
  @ApiOperation({ summary: 'Login user/company' })
  @ApiBody({ type: LoginDTO })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() data: LoginDTO) {
    return await this.accountService.login(data);
  }

  @Get('/company/:id')
  @ApiOperation({ summary: 'Get company by id' })
  @ApiResponse({ status: 200, description: 'Company' })
  async getCompanyById(@Param('id') id: ObjectId) {
    return await this.accountService.getCompanyById(id);
  }

  @Patch('/edit/:id')
  @ApiOperation({ summary: 'Edit any account type' })
  @ApiResponse({ status: 200, description: 'Account edited' })
  async editAccount(
    @Param('id') id: ObjectId,
    @Body() data: CreateAccountDTO,
  ) {
    return await this.accountService.editAccount(id, data);
  }

  @Delete('/delete/:id')
  @ApiOperation({ summary: 'Delete any account type' })
  @ApiResponse({ status: 200, description: 'Deleted account' })
  async deleteAccount(
    @Param('id') id: ObjectId,
  ) {
    return await this.accountService.deleteAccount(id);
  }
}
