import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { CreateIndustryDTO } from 'src/DTO/industry.dto';
import { IIndustry } from 'src/types/industry.types';

@Injectable()
export class IndustryService {
  private readonly logger = new Logger(IndustryService.name);

  constructor(@InjectModel("Industry") private readonly industryModel: Model<IIndustry>) {}

    async createIndustry(createIndustryDto: any) {
    const payload: any = { ...createIndustryDto };

    if (!payload.parent_industry) {
        delete payload.parent_industry;
    }
    console.log({payload});
    
    const industry = new this.industryModel(payload);
    return await industry.save();
    }


  async getAll() {
    try {
        const industries = await this.industryModel.find({});
        console.log({industries});
        
        return industries;
    } catch (error) {
        console.log({error});
        throw new InternalServerErrorException();
    }
  }

  async delete(id: ObjectId) {
    try {
        const deleted = await this.industryModel.findByIdAndDelete(id);
        console.log({deleted});
        
        return deleted;
    } catch (error) {
        console.log({error});
        throw new InternalServerErrorException();
    }
  }

}
