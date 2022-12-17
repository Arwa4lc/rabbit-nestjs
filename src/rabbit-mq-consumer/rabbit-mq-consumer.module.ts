import { Module } from '@nestjs/common';
import { RabbitMqConsumerService } from './rabbit-mq-consumer.service';

@Module({
  imports: [],
  providers: [RabbitMqConsumerService],
})
export class RabbitMqConsumerModule {}
