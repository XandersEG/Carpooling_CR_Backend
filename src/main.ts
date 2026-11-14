import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // permite que el portal web llame al api desde otro origen
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();