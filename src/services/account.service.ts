import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from "bcrypt";
import { Model, ObjectId } from 'mongoose';
import { CreateAccountDTO, LoginDTO } from 'src/DTO/account.dto';
import { EAccountType, IAccount } from 'src/types/account.types';
import { IIndustry } from 'src/types/industry.types';
import { generateAuthToken } from 'src/utils/token';
import { EmailService } from './email.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel("Account") private readonly accountModel: Model<IAccount>,
    @InjectModel("Industry") private readonly industryModel: Model<IIndustry>,
    @InjectModel("DeletionReport") private readonly deletionReportModel: Model<any>,
    private readonly emailService: EmailService
  ) { }

  async createAccount(createAccountDto: any, type: EAccountType) {
    const existingAccount = await this.accountModel.findOne({ email: createAccountDto.email.toLowerCase() });
    if (existingAccount) {
      throw new ConflictException("Email already in use");
    }

    const salt = await bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hashSync(createAccountDto.password, salt);

    const payload = {
      ...createAccountDto,
      type,
      password: hashedPassword,
      push_token: createAccountDto.push_token,
      email: createAccountDto.email.toLowerCase()
    }

    const newAccount = await this.accountModel.create(payload);
    const token = await generateAuthToken(newAccount);

    return {
      account: newAccount,
      token
    };
  }

  async fetchAcocunts(type: EAccountType, select?: string) {
    const accounts = await this.accountModel.find({ type: type }).select(select ? select : "-password").populate("industries").sort({ createdAt: "desc" });
    return accounts;
  }

  async login(loginDTO: LoginDTO) {
    try {
      console.log({ loginDTO });
      const email = loginDTO.email.toLowerCase();

      const account = await this.accountModel.findOne({ email });

      if (!account) {
        throw new NotFoundException("Account not found");
      }

      const push_token_has_changed = account.push_token !== loginDTO.push_token;

      if (push_token_has_changed) {
        await this.accountModel.findByIdAndUpdate(account._id, { push_token: loginDTO.push_token });
      }

      console.log({ account });


      const validPassword = await bcrypt.compareSync(loginDTO.password, account.password);

      console.log({ validPassword });

      if (!validPassword) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const token = await generateAuthToken(account);
      console.log({ token });


      return {
        data: token,
        message: "Login success"
      }
    } catch (error) {
      console.log({ error });
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException()
    }
  }

  async getCompanyById(id: ObjectId) {
    try {
      const company = await this.accountModel.findById(id).select("-password");
      return company;
    } catch (error) {
      console.log({ error });
      throw new InternalServerErrorException()
    }
  }

  async editAccount(id: ObjectId, data: Partial<CreateAccountDTO>) {
    try {
      if (data.password) {
        const salt = await bcrypt.genSaltSync(10);
        data.password = await bcrypt.hashSync(data.password, salt);
      }

      const newAccount = await this.accountModel.findByIdAndUpdate(id, data, { new: true });
      console.log({ newAccount });
      return newAccount;
    } catch (error) {
      console.log({ error });
      throw new InternalServerErrorException()
    }
  }

  async deleteAccount(id: ObjectId) {
    try {
      const account = await this.accountModel.findById(id);
      if (!account) throw new NotFoundException("Account not found");

      if (account.type === EAccountType.COMPANY) {
        // Save report instead of deleting
        await this.deletionReportModel.create({
          accountId: id,
          accountDetails: account.toObject(),
        });

        throw new BadRequestException("Business accounts cannot be deleted directly. Our team will contact you within 24 hours.");
      }

      const deleted = await this.accountModel.findByIdAndDelete(id);
      return deleted;
    } catch (error) {
      console.log({ error });
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException()
    }
  }

  async searchCompanies(query: string, limit: number = 20) {
    try {
      if (!query || query.trim() === '') {
        return await this.fetchAcocunts(EAccountType.COMPANY);
      }

      // Find industries that match the query
      const industries = await this.industryModel.find({
        name: { $regex: query, $options: 'i' }
      }).select('_id');
      const industryIds = industries.map(i => i._id);

      const companies = await this.accountModel.find({
        type: EAccountType.COMPANY,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { "services.name": { $regex: query, $options: 'i' } },
          { industries: { $in: industryIds } }
        ]
      } as any)
        .select("-password")
        .populate('industries')
        .limit(limit)
        .exec();

      return companies;
    } catch (error) {
      console.log({ error });
      throw new InternalServerErrorException();
    }
  }

  async sendResetOTP(email: string, language: string = 'sq') {
    const account = await this.accountModel.findOne({ email });
    if (!account) throw new Error("Email not found");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);

    account.resetPasswordOTP = otp;
    account.resetPasswordOTPExpires = expires;
    await account.save();

    await this.emailService.sendOTPEmail(email, otp, language);
    return { message: "OTP sent successfully" };
  }

  async verifyOTP(email: string, otp: string) {
    const account = await this.accountModel.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: new Date() }
    });

    if (!account) return { success: false, message: "Invalid or expired OTP" };
    return { success: true, message: "OTP verified" };
  }

  async resetPassword(email: string, otp: string, newPassword: any) {
    const account = await this.accountModel.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: new Date() }
    });

    if (!account) throw new Error("Invalid or expired OTP");

    const salt = await bcrypt.genSaltSync(10);
    account.password = await bcrypt.hashSync(newPassword, salt);
    account.resetPasswordOTP = undefined;
    account.resetPasswordOTPExpires = undefined;
    await account.save();

    return { message: "Password reset successfully" };
  }
}
