import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { RabbitMqService } from './rabbit-mq/rabbit-mq.service';

@Controller('/producer')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly rabbitMQService: RabbitMqService,
  ) {}

  @Post()
  async getHello(@Body() body) {
    console.log(
      '🚀 ~ file: app.controller.ts:22 ~ AppController ~ getHello ~ body',
      body,
    );
    await this.rabbitMQService.sendData(body);
    return 'Message sent to the queue!';
  }
}
