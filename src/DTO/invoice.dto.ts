import { IsString, IsOptional } from "class-validator";
import { IAccount } from "src/types/account.types";

export class CreateInvoiceAiDto {
  prompt: string;
  history?: { role: 'user' | 'assistant' | 'system', content: string }[]; 
  user: {
    company: IAccount
  };
}

export class EditInvoiceAiDto {
  @IsString()
  prompt: string;
}

export class InvoiceIdDto {
  @IsString()
  id: string;
}
