import { InternalServerErrorException } from '@nestjs/common';
import { TermiiSmsProvider } from './termii.provider';

describe('TermiiSmsProvider', () => {
  const provider = new TermiiSmsProvider();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TERMII_API_KEY;
    delete process.env.TERMII_SENDER_ID;
  });

  it('rejette un envoi sans TERMII_API_KEY', async () => {
    delete process.env.TERMII_API_KEY;

    await expect(
      provider.send({ to: '+237690000000', body: 'code 123456' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it("appelle l'API Termii avec un numero sans plus et un body JSON", async () => {
    process.env.TERMII_API_KEY = 'test-key';
    process.env.TERMII_SENDER_ID = 'Cercle';

    let captured: { url: string; body: string } | undefined;
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      captured = { url, body: String(init?.body) };
      return new Response(JSON.stringify({ message: 'Successfully Sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await provider.send({ to: '+237 690 000 000', body: 'code 123456' });

    expect(captured?.url).toBe('https://api.ng.termii.com/api/sms/send');
    const body = JSON.parse(captured?.body ?? '{}');
    expect(body).toMatchObject({
      api_key: 'test-key',
      to: '237690000000',
      from: 'Cercle',
      sms: 'code 123456',
      type: 'plain',
      channel: 'generic',
    });
  });

  it('leve une erreur sur une reponse Termii en echec HTTP', async () => {
    process.env.TERMII_API_KEY = 'test-key';

    const fetchMock = jest.fn(
      async () =>
        new Response('Unauthorized', {
          status: 401,
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider.send({ to: '+237690000000', body: 'code 123456' }),
    ).rejects.toThrow(/HTTP 401/);
  });

  it('leve une erreur si Termii renvoie un message d echec', async () => {
    process.env.TERMII_API_KEY = 'test-key';

    const fetchMock = jest.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Invalid phone number' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider.send({ to: '+237690000000', body: 'code 123456' }),
    ).rejects.toThrow(/Invalid phone number/);
  });
});
