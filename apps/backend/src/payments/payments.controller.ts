import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaymentsService } from './payments.service';
import { AddPaymentMethodDto } from './dto/add-payment-method.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrepareContributionDto } from './dto/prepare-contribution.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('prepare')
  prepare(@CurrentUser() user: JwtPayload, @Body() dto: PrepareContributionDto) {
    return this.paymentsService.prepareContribution(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(@CurrentUser() user: JwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.phoneNumber, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('methods')
  listMethods(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.listPaymentMethods(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('methods')
  addMethod(@CurrentUser() user: JwtPayload, @Body() dto: AddPaymentMethodDto) {
    return this.paymentsService.addPaymentMethod(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('methods/:id')
  findOneMethod(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.paymentsService.listPaymentMethods(user.sub).then((methods) =>
      methods.find((m) => m.id === id),
    );
  }

  /**
   * Webhook CinetPay (public : authentifié par HMAC, pas par JWT).
   * La signature se calcule sur le CORPS BRUT (rawBody: true dans main.ts)
   * avec l'en-tête `x-token`. Format CinetPay :
   * { transaction_id, payment_token, status: 'ACCEPTED' | 'REFUSED', … }
   * On renvoie 200 à CinetPay même sans transaction connue (idempotence).
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-token') token: string,
    @Body() payload: {
      transaction_id: string;
      payment_token: string;
      status: string;
    },
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const confirmed = payload.status === 'ACCEPTED';
    try {
      return await this.paymentsService.handleWebhook(raw, token, {
        transactionId: payload.transaction_id,
        externalReference: payload.payment_token,
        status: confirmed ? 'confirmed' : 'failed',
      });
    } catch {
      // CinetPay exige un acquittement 200 ; on log l'erreur côté service.
      return { received: true };
    }
  }
}
