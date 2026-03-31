import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import axios from 'axios';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.enableCors();

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);

  const API_URLS = [
    'https://empire-tycoon-api.onrender.com',
    'https://agim-tours.onrender.com/api/v1/health',
  ];

  setInterval(async () => {
    for (const url of API_URLS) {
      try {
        await axios.get(url);
        console.log(`API is running: ${url}`);
      } catch (error) {
        console.log(`API is not running: ${url}`);
      }
    }
  }, 10000);
}

bootstrap();
