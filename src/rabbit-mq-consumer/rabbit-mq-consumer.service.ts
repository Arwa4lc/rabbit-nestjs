import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';

const data: any = {};
@Injectable()
export class RabbitMqConsumerService implements OnApplicationBootstrap {
  private connection: amqp.AmqpConnectionManager;
  private channel: amqp.ChannelWrapper;

  async onApplicationBootstrap(): Promise<void> {
    this.connection = amqp.connect('amqp://localhost:5672');
    this.channel = this.connection.createChannel({
      setup: () => {
        return Promise.all([]);
      },
    });

    this.consume();
  }

  // consume messages from RabbitMQ
  async consume(): Promise<void> {
    this.connection.on('connect', function () {
      console.log(
        '\x1b[32m%s\x1b[0m',
        '[!] AMQP Connected from test consumer: ',
      );
    });

    await this.channel.consume('nest-main-queue', (msg) => {
      console.log('msg');
      console.log(
        '🚀 ~ file: index.js:22 ~ newPromise ~ msg.fields.redelivered',
        msg.fields.redelivered,
      );

      return new Promise<void>((resolve, reject) => {
        if (msg.fields.redelivered) {
          reject('Message was redelivered, so something wrong happened');
          return;
        }

        // resolve();
        // reject();
        throw new Error('Something wrong with handler');
      })
        .then(() => {
          console.log('msg ack');
          this.channel.ack(msg);
        })
        .catch((err) => {
          return this._sendMsgToRetry({
            msg,
            queue: 'nest-main-queue',
            channel: this.channel,
            err,
          });
        });
    });
  }

  async _sendMsgToRetry(args) {
    const channel = args.channel;
    const msg = args.msg;
    const attempts_total = 3;

    // ack original msg
    channel.ack(msg);

    // Unpack content, update and pack it back
    function getAttemptAndUpdatedContent(msg) {
      data.content = JSON.parse(msg.content.toString('utf8'));

      // "exchange" field should exist, but who knows. in the other case we would have endless loop
      // cos native msg.fields.exchange will be changed after walking through DLX
      data.exchange = data.exchange || msg.fields.exchange;
      data.try_attempt = ++data.try_attempt || 1;
      console.log(
        '🚀 ~ file: index.js:77 ~ getAttemptAndUpdatedContent ~ data.try_attempt',
        data.try_attempt,
      );

      data.content = Buffer.from(JSON.stringify(data.content), 'utf8');

      return data;
    }

    const { try_attempt, content } = getAttemptAndUpdatedContent(msg);
    console.log('🚀 ~ file: index.js:127 ~ _sendMsgToRetry ~ content', content);
    console.log(
      '🚀 ~ file: index.js:127 ~ _sendMsgToRetry ~ try_attempt',
      try_attempt,
    );

    if (try_attempt <= attempts_total) {
      const routingKey = this._getTTLRoutingKey({ attempt: try_attempt });
      console.log(
        '🚀 ~ file: index.js:99 ~ _sendMsgToRetry ~ routingKey',
        routingKey,
      );
      const options = {
        contentEncoding: 'utf8',
        contentType: 'application/json',
        persistent: true,
      };

      // trying to reproduce original message
      // including msg.properties.messageId and such
      // but excluding msg.fields.redelivered
      Object.keys(msg.properties).forEach((key) => {
        options[key] = msg.properties[key];
      });

      await this.channel.publish(
        'nest-ttl-exchange',
        routingKey,
        content,
        options as any,
      );
    }

    return Promise.resolve();
  }

  _getTTLRoutingKey(options) {
    const attempt = options.attempt || 1;

    return `retry-${attempt}`;
  }
}
