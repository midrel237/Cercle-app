import { Injectable } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';
import { ConsoleSmsProvider } from './console.provider';
import { TermiiSmsProvider } from './termii.provider';

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor() {
    const kind = process.env.SMS_PROVIDER ?? 'console';

    if (kind === 'console') {
      this.provider = new ConsoleSmsProvider();
    } else if (kind === 'termii') {
      this.provider = new TermiiSmsProvider();
    } else {
      throw new Error(
        `SMS_PROVIDER inconnu: "${kind}". Valeurs acceptées: console, termii.`,
      );
    }
  }

  send(message: SmsMessage): Promise<void> {
    return this.provider.send(message);
  }
}
