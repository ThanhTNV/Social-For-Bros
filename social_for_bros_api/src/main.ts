import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap()
  .then(() => {
    console.log(
      `Social for Bros API is running on port ${process.env.PORT ?? 3001}`,
    );
  })
  .catch((err) => {
    console.error('Error starting Social for Bros API:', err);
  });
