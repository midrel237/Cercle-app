import { Injectable } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async send(message: SmsMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[SMS][${this.name}] -> ${message.to}: "${message.body}"`);
  }
}
