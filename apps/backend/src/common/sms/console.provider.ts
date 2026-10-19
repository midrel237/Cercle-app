import { Injectable } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async send(message: SmsMessage): Promise<void> {
    // no-console est desactive pour tout le backend (eslint.config.mjs).
    console.log(`[SMS][${this.name}] -> ${message.to}: "${message.body}"`);
  }
}
