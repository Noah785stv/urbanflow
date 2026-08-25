'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api-client';
import * as authApi from '../../lib/auth-api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const MIN_PASSWORD_LENGTH = 12;

type Step = 'register' | 'verify';

/**
 * F1 n'envoie pas d'e-mail réel : le lien de vérification est journalisé
 * côté serveur (console de l'API) — raccourci de dev assumé et documenté
 * (§9, §16). Cette étape permet de coller le token pour finir le parcours
 * sans quitter l'interface.
 */
export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.register(email, password);
      setStep('verify');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Inscription impossible. Réessayez.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyEmail(token);
      router.push('/login');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Vérification impossible. Réessayez.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'verify') {
    return (
      <form
        onSubmit={handleVerify}
        noValidate
        className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
      >
        <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">
          Vérifiez votre e-mail
        </h1>
        <p className="text-[15px] leading-[24px] text-ink-600">
          Compte créé pour <strong>{email}</strong>. En environnement de développement, aucun e-mail
          n’est réellement envoyé (§F1) : le lien de vérification est journalisé dans les logs de
          l’API. Collez le token qu’il contient ci-dessous.
        </p>

        <Input
          id="verify-token"
          name="token"
          type="text"
          label="Token de vérification"
          required
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm font-medium text-alert-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Vérification…' : 'Valider et se connecter'}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleRegister}
      noValidate
      className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
    >
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Inscription</h1>

      <Input
        id="register-email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Input
        id="register-password"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-alert-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Création…' : 'Créer un compte'}
      </Button>

      <p className="text-[15px] leading-[24px] text-ink-600">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-brand-blue-700 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
