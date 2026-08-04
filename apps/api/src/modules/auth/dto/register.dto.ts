import { IsEmail, IsString, MinLength } from 'class-validator';

/** DTO d'inscription (§5.1). Le mot de passe en clair ne quitte jamais ce DTO. */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12, {
    message: 'Le mot de passe doit contenir au moins 12 caractères.',
  })
  password!: string;
}
