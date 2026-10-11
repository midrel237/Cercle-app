import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { SmsService } from '../common/sms/sms.service';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreatePinDto } from './dto/create-pin.dto';
import { LoginDto } from './dto/login.dto';

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const PIN_SALT_ROUNDS = 10;

/**
 * Gere l'inscription progressive (telephone + OTP d'abord, profil et PIN
 * completes ensuite), la connexion, et l'emission des jetons JWT.
 *
 * Parcours reel cote mobile (ecrans 4-5, cf. document de comprehension
 * §8.4/§8.5) : l'utilisateur ne saisit que son numero de telephone avant la
 * verification OTP - il n'existe pas d'ecran de saisie du nom a ce stade.
 * Le compte est donc cree des la premiere verification OTP reussie, avec
 * uniquement le numero de telephone ; `fullName` et `pinHash` restent
 * `null` jusqu'aux etapes KYC / creation du PIN (onboarding, ecrans 16-17).
 *
 * Etape suivante cote produit : KYC (voir module `users`), biometrie geree
 * cote mobile via Expo Local Authentication (le backend ne stocke aucune
 * donnee biometrique).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
  ) {}

  /**
   * Genere un code a 6 chiffres, invalide les codes precedents non
   * consommes pour ce numero, et stocke son hash (jamais le code en clair)
   * avec une expiration courte.
   *
   * L'envoi passe par SmsService (SMS_PROVIDER : console en dev,
   * africas-talking en production). En developpement, le code est aussi
   * renvoye dans la reponse (`devCode`) pour faciliter les tests sans SMS
   * reel - ce champ est automatiquement omis si NODE_ENV=production.
   */
  async requestOtp(dto: RequestOtpDto) {
    const { phoneNumber } = dto;
    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
    const codeHash = await bcrypt.hash(code, PIN_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.updateMany({
      where: { phoneNumber, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.otpCode.create({
      data: { phoneNumber, codeHash, expiresAt },
    });

    await this.sms.send({
      to: phoneNumber,
      body: `Cercle: votre code de verification est ${code}. Valable ${OTP_TTL_MINUTES} minutes.`,
    });

    return {
      phoneNumber,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    };
  }

  /**
   * Verifie le code contre le dernier OTP actif du numero. Verrouille
   * apres `OTP_MAX_ATTEMPTS` tentatives ratees pour limiter le brute-force
   * d'un code a 6 chiffres. Cree le compte a la volee s'il n'existe pas
   * encore (inscription progressive, cf. commentaire de classe), puis
   * ouvre directement une session (jetons JWT) : cote mobile, l'ecran OTP
   * enchaine sans repasser par un ecran de connexion separe.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const { phoneNumber, code } = dto;

    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneNumber, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Aucun code en attente pour ce numero. Demandez-en un nouveau.');
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Ce code a expire. Demandez-en un nouveau.');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Trop de tentatives. Demandez un nouveau code.');
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Code incorrect.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    const isNewAccount = !user;
    if (!user) {
      user = await this.prisma.user.create({ data: { phoneNumber } });
    }

    const tokens = await this.issueTokens(user.id, user.phoneNumber);
    return {
      verified: true,
      isNewAccount,
      hasPinConfigured: !!user.pinHash,
      ...tokens,
    };
  }

  /**
   * Complete le profil d'un compte deja cree par `verifyOtp` (nom, langue,
   * pays de residence...). Reste utilisable pour une inscription
   * explicite si un ecran dedie est ajoute plus tard ; ne rejette plus le
   * numero comme "deja existant" tant que le profil n'est pas complet.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing?.fullName) {
      throw new UnauthorizedException('Un compte existe deja pour ce numero.');
    }

    const data = {
      fullName: dto.fullName,
      language: dto.language.toUpperCase() as 'FR' | 'EN',
      countryOfResidence: dto.countryOfResidence,
      preferredCurrency: dto.preferredCurrency,
    };

    if (existing) {
      return this.prisma.user.update({ where: { id: existing.id }, data });
    }
    return this.prisma.user.create({ data: { phoneNumber: dto.phoneNumber, ...data } });
  }

  async createPin(dto: CreatePinDto) {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
    if (!user) {
      throw new BadRequestException('Aucun compte pour ce numero. Verifiez votre telephone d\'abord.');
    }
    const pinHash = await this.hashPin(dto.pin);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { pinHash },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (!user || !user.pinHash || !(await this.verifyPin(dto.pin, user.pinHash))) {
      throw new UnauthorizedException('Numero ou code PIN invalide.');
    }
    return this.issueTokens(user.id, user.phoneNumber);
  }

  private async issueTokens(userId: string, phoneNumber: string) {
    const payload = { sub: userId, phoneNumber };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as JwtSignOptions['expiresIn'],
    });
    return { accessToken, refreshToken };
  }

  private async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, PIN_SALT_ROUNDS);
  }

  private async verifyPin(pin: string, pinHash: string): Promise<boolean> {
    return bcrypt.compare(pin, pinHash);
  }
}
