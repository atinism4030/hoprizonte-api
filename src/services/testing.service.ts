import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAccountDTO } from 'src/DTO/account.dto';
import { AccountType, IAccount } from 'src/types/account.types';

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);

  constructor(@InjectModel("Account") private readonly accountModel: Model<IAccount>) { }

 async insertBulkAccounts(createAccountDto: CreateAccountDTO[]) {
    try {
        console.log({createAccountDto});
        
        return await this.accountModel.insertMany(createAccountDto);
    } catch (error) {
        console.log({error});
    }
 }

}
