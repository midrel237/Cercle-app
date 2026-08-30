import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
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
 * Gère l'inscription progressive (téléphone + OTP d'abord, profil et PIN
 * complétés ensuite), la connexion, et l'émission des jetons JWT.
 *
 * Parcours réel côté mobile (écrans 4-5, cf. document de compréhension
 * §8.4/§8.5) : l'utilisateur ne saisit que son numéro de téléphone avant la
 * vérification OTP — il n'existe pas d'écran de saisie du nom à ce stade.
 * Le compte est donc créé dès la première vérification OTP réussie, avec
 * uniquement le numéro de téléphone ; `fullName` et `pinHash` restent
 * `null` jusqu'aux étapes KYC / création du PIN (onboarding, écrans 16-17).
 *
 * Étape suivante côté produit : KYC (voir module `users`), biométrie gérée
 * côté mobile via Expo Local Authentication (le backend ne stocke aucune
 * donnée biométrique).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Génère un code à 6 chiffres, invalide les codes précédents non
   * consommés pour ce numéro, et stocke son hash (jamais le code en clair)
   * avec une expiration courte.
   *
   * ⚠ Aucun fournisseur SMS n'est encore branché (à choisir, ex. Twilio /
   * Vonage / un agrégateur local) : le code est pour l'instant seulement
   * journalisé côté serveur. En développement, il est aussi renvoyé dans
   * la réponse (`devCode`) pour permettre de tester le parcours sans SMS
   * réel — ce champ est automatiquement omis si NODE_ENV=production.
   */
  async requestOtp(dto: RequestOtpDto) {
    const { phoneNumber } = dto;
    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
    const codeHash = await bcrypt.hash(code, PIN_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.updateMany({
      where: { phoneNumber, consumedAt: null },
      data: { consumedAt: new Date() }, // invalide les codes précédents encore actifs
    });
    await this.prisma.otpCode.create({
      data: { phoneNumber, codeHash, expiresAt },
    });

    // TODO: remplacer par un vrai envoi SMS avant toute mise en production.
    // eslint-disable-next-line no-console
    console.log(`[OTP][DEV] ${phoneNumber} → ${code} (expire dans ${OTP_TTL_MINUTES} min)`);

    return {
      phoneNumber,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    };
  }

  /**
   * Vérifie le code contre le dernier OTP actif du numéro. Verrouille
   * après `OTP_MAX_ATTEMPTS` tentatives ratées pour limiter le brute-force
   * d'un code à 6 chiffres. Crée le compte à la volée s'il n'existe pas
   * encore (inscription progressive, cf. commentaire de classe), puis
   * ouvre directement une session (jetons JWT) : côté mobile, l'écran OTP
   * enchaîne sans repasser par un écran de connexion séparé.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const { phoneNumber, code } = dto;

    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneNumber, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Aucun code en attente pour ce numéro. Demandez-en un nouveau.');
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Ce code a expiré. Demandez-en un nouveau.');
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
   * Complète le profil d'un compte déjà créé par `verifyOtp` (nom, langue,
   * pays de résidence...). Reste utilisable pour une inscription
   * explicite si un écran dédié est ajouté plus tard ; ne rejette plus le
   * numéro comme "déjà existant" tant que le profil n'est pas complet.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing?.fullName) {
      throw new UnauthorizedException('Un compte existe déjà pour ce numéro.');
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
      throw new BadRequestException('Aucun compte pour ce numéro. Vérifiez votre téléphone d\u2019abord.');
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
      throw new UnauthorizedException('Numéro ou code PIN invalide.');
    }
    return this.issueTokens(user.id, user.phoneNumber);
  }

  private async issueTokens(userId: string, phoneNumber: string) {
    const payload = { sub: userId, phoneNumber };
    // @nestjs/jwt 11 attend un littéral "StringValue" (ex. "15m") pour
    // expiresIn ; une valeur issue de process.env reste un `string`
    // générique côté typage, d'où le cast explicite ci-dessous.
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
