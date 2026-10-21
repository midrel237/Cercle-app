import { Injectable } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';
import { ConsoleSmsProvider } from './console.provider';
import { AfricasTalkingSmsProvider } from './africas-talking.provider';

// Alias acceptés pour SMS_PROVIDER. Le .env.example racine documente
// "africastalking" (sans tiret) tandis que le nom interne du provider est
// "africas-talking" : les deux formes sont valides pour éviter tout
// "SMS_PROVIDER inconnu" au démarrage selon la doc suivie.
const AFRICASTALKING_ALIASES = new Set(['africastalking', 'africas-talking']);

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor() {
    const kind = process.env.SMS_PROVIDER ?? 'console';

    if (kind === 'console') {
      this.provider = new ConsoleSmsProvider();
    } else if (AFRICASTALKING_ALIASES.has(kind)) {
      this.provider = new AfricasTalkingSmsProvider();
    } else {
      throw new Error(
        `SMS_PROVIDER inconnu: "${kind}". Valeurs acceptées: console, africastalking, africas-talking.`,
      );
    }
  }

  send(message: SmsMessage): Promise<void> {
    return this.provider.send(message);
  }
}
