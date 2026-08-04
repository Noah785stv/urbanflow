import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');

function buildService(key: string | undefined): EncryptionService {
  const configService = { get: () => key } as unknown as ConfigService;
  return new EncryptionService(configService);
}

describe('EncryptionService', () => {
  it('chiffre puis déchiffre pour retrouver le texte original (aller-retour)', () => {
    const service = buildService(VALID_KEY);
    const plainText = '48.1173,-1.6778';

    const encrypted = service.encrypt(plainText);

    expect(encrypted).not.toContain(plainText);
    expect(service.decrypt(encrypted)).toBe(plainText);
  });

  it('produit un texte chiffré différent à chaque appel (IV aléatoire)', () => {
    const service = buildService(VALID_KEY);
    const plainText = '48.1173,-1.6778';

    expect(service.encrypt(plainText)).not.toBe(service.encrypt(plainText));
  });

  it("échoue à l'instanciation si ENCRYPTION_KEY est absente", () => {
    expect(() => buildService(undefined)).toThrow(/ENCRYPTION_KEY manquante/);
  });

  it("échoue à l'instanciation si ENCRYPTION_KEY n'a pas la bonne longueur", () => {
    const shortKey = Buffer.alloc(16, 1).toString('base64');
    expect(() => buildService(shortKey)).toThrow(/ENCRYPTION_KEY invalide/);
  });

  it('échoue au déchiffrement si le payload a été altéré (authTag invalide)', () => {
    const service = buildService(VALID_KEY);
    const encrypted = service.encrypt('domicile-secret');
    const [iv, authTag, ciphertext] = encrypted.split('.') as [
      string,
      string,
      string,
    ];
    const tampered = [iv, authTag, `${ciphertext.slice(0, -2)}AA`].join('.');

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('échoue au déchiffrement si le format du payload est invalide', () => {
    const service = buildService(VALID_KEY);
    expect(() => service.decrypt('valeur-non-chiffree')).toThrow(
      /Payload chiffré invalide/,
    );
  });
});
