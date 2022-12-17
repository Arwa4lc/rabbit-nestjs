import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';

@Injectable()
export class RabbitMqService implements OnModuleInit {
  private connection: amqp.AmqpConnectionManager;
  private channel: amqp.ChannelWrapper;

  async onModuleInit() {
    this.connection = amqp.connect('amqp://localhost:5672');
    this.channel = this.connection.createChannel({
      setup: (channel: amqp.ChannelWrapper) => {
        return Promise.all([
          channel.assertExchange('nest-main-exchange', 'fanout', {
            durable: true,
          }),
          channel.assertExchange('nest-dlx-exchange', 'fanout', {
            durable: true,
          }),
          channel.assertExchange('nest-ttl-exchange', 'direct', {
            durable: true,
          }),

          channel.assertQueue('nest-main-queue', { durable: true }),
          channel.assertQueue('nest-retry-queue-1-30s', {
            durable: true,
            deadLetterExchange: 'nest-dlx-exchange',
            messageTtl: 30000,
          }),
          channel.assertQueue('nest-retry-queue-2-1m', {
            durable: true,
            deadLetterExchange: 'nest-dlx-exchange',
            messageTtl: 60000,
          }),
          channel.assertQueue('nest-retry-queue-3-3m', {
            durable: true,
            deadLetterExchange: 'nest-dlx-exchange',
            messageTtl: 180000,
          }),

          channel.bindQueue('nest-main-queue', 'nest-main-exchange', undefined),
          channel.bindQueue('nest-main-queue', 'nest-dlx-exchange', undefined),
          channel.bindQueue(
            'nest-retry-queue-1-30s',
            'nest-ttl-exchange',
            'retry-1',
          ),
          channel.bindQueue(
            'nest-retry-queue-2-1m',
            'nest-ttl-exchange',
            'retry-2',
          ),
          channel.bindQueue(
            'nest-retry-queue-3-3m',
            'nest-ttl-exchange',
            'retry-3',
          ),
        ]);
      },
    });

    this.connection.on('connect', function () {
      console.log('[!] AMQP Connected: ');
    });

    this.connection.on('disconnect', function (params) {
      console.log('[!] AMQP Disconnected: ', params.err.stack);
    });
  }

  async sendData(data) {
    // send data to queue

    const publish = await this.channel.publish(
      'nest-main-exchange',
      undefined,
      Buffer.from(JSON.stringify({ data })),
    );
    console.log(
      '🚀 ~ file: rabbit-mq.service.ts:89 ~ RabbitMqService ~ sendData ~ publish',
      publish,
    );

    // close the channel and connection
    // await this.channel.close();
    // await this.connection.close();
  }
}
