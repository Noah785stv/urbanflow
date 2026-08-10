import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

/**
 * Chiffrement applicatif AES-256-GCM (§4.3, §5.7 A02) pour les données
 * personnelles sensibles (domicile/travail) qui ne doivent jamais être
 * stockées ni requêtées en clair. Un payload chiffré encode `iv.authTag.ciphertext`
 * (chacun en base64) pour être stocké tel quel dans une colonne `text`.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const encodedKey = configService.get<string>('ENCRYPTION_KEY');
    if (!encodedKey) {
      throw new Error(
        "ENCRYPTION_KEY manquante : impossible d'initialiser EncryptionService.",
      );
    }

    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== KEY_LENGTH_BYTES) {
      throw new Error(
        `ENCRYPTION_KEY invalide : attendu ${KEY_LENGTH_BYTES} octets (base64), obtenu ${key.length}.`,
      );
    }

    this.key = key;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, ciphertext]
      .map((buffer) => buffer.toString('base64'))
      .join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, authTagB64, ciphertextB64] = payload.split('.');
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error(
        'Payload chiffré invalide : format attendu "iv.authTag.ciphertext".',
      );
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const plainText = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plainText.toString('utf8');
  }
}
