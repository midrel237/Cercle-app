import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SmsMessage, SmsProvider } from './sms-provider.interface';

const AT_API_URL = 'https://api.africastalking.com/version1/messaging';

@Injectable()
export class AfricasTalkingSmsProvider implements SmsProvider {
  readonly name = 'africas-talking';

  async send(message: SmsMessage): Promise<void> {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const senderId = process.env.AFRICASTALKING_SENDER_ID;

    if (!username || !apiKey) {
      throw new InternalServerErrorException(
        "Configuration Africa's Talking absente (username/apiKey).",
      );
    }

    const body = new URLSearchParams({
      username,
      to: message.to,
      message: message.body,
      ...(senderId ? { from: senderId } : {}),
    });

    const response = await fetch(AT_API_URL, {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new InternalServerErrorException(
        `Echec envoi SMS (${this.name}, HTTP ${response.status}): ${detail}`,
      );
    }

    const payload = (await response.json()) as {
      SMSMessageData?: { Recipients?: Array<{ status?: string }> };
    };

    const status = payload.SMSMessageData?.Recipients?.[0]?.status;
    if (status !== 'Success') {
      throw new InternalServerErrorException(
        `Echec envoi SMS (${this.name}): statut destinataire "${status ?? 'inconnu'}"`,
      );
    }
  }
}
