import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AccountController } from './controllers/account.controller';
import { StoryController } from './controllers/story.controller';
import { ProjectController } from './controllers/project.controller';

import { AccountService } from './services/account.service';
import { StoryService } from './services/story.service';
import { ProjectService } from './services/project.service';
import { AccountSchema } from './models/Account.model';
import { TestingController } from './controllers/testing.controller';
import { TestingService } from './services/testing.service';
import { IndustrySchema } from './models/industry.model';
import { IndustryController } from './controllers/industry.controller';
import { IndustryService } from './services/industry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{name: "Account", schema:AccountSchema}]),
    MongooseModule.forFeature([{name: "Industry", schema:IndustrySchema}]),
    // MongooseModule.forFeature([{name: "Story", schema:}]),
    // MongooseModule.forFeature([{name: "Project", schema:}]),
    ScheduleModule.forRoot(),
  ],

  controllers: [
    AppController,
    AccountController,
    StoryController,
    ProjectController,
    TestingController,
    IndustryController
  ],

  providers: [
    AppService,
    AccountService,
    StoryService,
    ProjectService,
    TestingService,
    IndustryService
  ],
})
export class AppModule {}
