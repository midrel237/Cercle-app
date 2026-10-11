import { Injectable } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';
import { ConsoleSmsProvider } from './console.provider';
import { AfricasTalkingSmsProvider } from './africas-talking.provider';

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor() {
    const kind = process.env.SMS_PROVIDER ?? 'console';
    this.provider =
      kind === 'africas-talking'
        ? new AfricasTalkingSmsProvider()
        : new ConsoleSmsProvider();

    if (kind !== 'console' && kind !== 'africas-talking') {
      throw new Error(`SMS_PROVIDER inconnu: "${kind}"`);
    }
  }

  send(message: SmsMessage): Promise<void> {
    return this.provider.send(message);
  }
}
