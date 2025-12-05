import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { CreateAccountDTO, LoginDTO } from 'src/DTO/account.dto';
import { EAccountType, IAccount } from 'src/types/account.types';
import bcrypt from "bcrypt";
import { generateAuthToken } from 'src/utils/token';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(@InjectModel("Account") private readonly accountModel: Model<IAccount>) { }

  async createAccount(createAccountDto: any, type: EAccountType) {
    const salt = await bcrypt.genSaltSync(10);
    console.log({createAccountDto});
    
    const hashedPassword = await bcrypt.hashSync(createAccountDto.password, salt);

    const payload = {
      ...createAccountDto,
      type,
      password: hashedPassword
    }

    const newAccount = this.accountModel.create(payload);
    console.log({newAccount});
    return newAccount;
  }

  async fetchAcocunts(type: EAccountType) {
    const accounts = await this.accountModel.find({type: type}).select("-password").populate("industries").sort({createdAt: "desc"});
    return accounts;
  }

  async login(loginDTO: LoginDTO) {
    try {
      console.log({loginDTO});
      
      const account = await this.accountModel.findOne({email: loginDTO.email});
      console.log({account});
      if(!account) {
        return {
          data: null,
          message: "Account not found"
        }
      }

      
      let validPassword = false;
      if(account.type === "COMPANY") {
        validPassword = (account.password == loginDTO.password)
      } else {
        validPassword = await bcrypt.compareSync(loginDTO.password, account.password);
      }
      
      console.log({validPassword});
      
      if(!validPassword) {
        return {
          data: null,
          message: "Invalid credentials"
        }
      }

      const token = await generateAuthToken(account);
      console.log({token});
      
      
      return {
        data: token,
        message: "Login success"
      }
    } catch (error) {
      console.log({error});
      throw new InternalServerErrorException()
    }
  }

  async getCompanyById(id: ObjectId) {
    try {
      const company = await this.accountModel.findById(id).select("-password");
      return company;
    } catch (error) {
      console.log({error});
      throw new InternalServerErrorException()
    }
  }

  async editAccount(id: ObjectId, editedCompany: CreateAccountDTO) {
    try {
      const newAccount = await this.accountModel.findByIdAndUpdate(id, editedCompany);
      console.log({newAccount});
      return newAccount;
    } catch (error) {
      console.log({error});
      throw new InternalServerErrorException()
    }
  }

  async deleteAccount(id: ObjectId) {
    try {
      const deleted = await this.accountModel.findByIdAndDelete(id);
      return deleted;
    } catch (error) {
      console.log({error});
      throw new InternalServerErrorException()
    }
  }

}
