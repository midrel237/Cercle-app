import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';

const TERMII_API_URL = 'https://api.ng.termii.com/api/sms/send';

@Injectable()
export class TermiiSmsProvider implements SmsProvider {
  readonly name = 'termii';

  async send(message: SmsMessage): Promise<void> {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Configuration Termii absente (TERMII_API_KEY).',
      );
    }

    // Termii attend un numéro au format international sans "+" (ex: 2376XXXXXXXX).
    const to = message.to.replace(/\D/g, '');

    const response = await fetch(TERMII_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        to,
        from: senderId ?? 'Cercle',
        sms: message.body,
        type: 'plain',
        channel: 'generic',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new InternalServerErrorException(
        `Echec envoi SMS (${this.name}, HTTP ${response.status}): ${detail}`,
      );
    }

    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    if (payload.message && !/sent/i.test(payload.message)) {
      throw new InternalServerErrorException(
        `Echec envoi SMS (${this.name}): ${payload.message}`,
      );
    }
  }
}
