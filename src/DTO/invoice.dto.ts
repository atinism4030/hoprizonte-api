import { IsString, IsOptional } from "class-validator";

export class CreateInvoiceAiDto {
  prompt: string;
  history?: { role: 'user' | 'assistant' | 'system', content: string }[];
  user: {
    company: any  // Use 'any' to avoid Swagger circular dependency with IAccount
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
