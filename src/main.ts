console.log('0. main.ts cargado');

async function bootstrap() {
  console.log('1. iniciando main.ts');
  try {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    console.log('2. cargando AppModule');
    const { AppModule } = await import('./app/app.module.js');
    console.log('3. creando la app');

    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors();

    await app.listen(process.env.PORT ?? 3000);
    console.log('4. app escuchando');
  } catch (error) {
    console.error('ERROR AL ARRANCAR:', error);
    throw error;
  }
}

bootstrap();