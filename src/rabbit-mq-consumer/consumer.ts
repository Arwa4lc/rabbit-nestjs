import { NestFactory } from '@nestjs/core';
import { RabbitMqConsumerModule } from './rabbit-mq-consumer.module';

async function bootstrap() {
  const app = await NestFactory.create(RabbitMqConsumerModule);
  app.init();
}

bootstrap();
