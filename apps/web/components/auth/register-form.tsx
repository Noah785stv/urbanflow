'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api-client';
import * as authApi from '../../lib/auth-api';
import {
  ERROR_TEXT_CLASS,
  HINT_TEXT_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
} from '../../lib/styles';

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
        <h1 className="text-2xl font-bold text-zinc-900">Vérifiez votre e-mail</h1>
        <p className={HINT_TEXT_CLASS}>
          Compte créé pour <strong>{email}</strong>. En environnement de développement, aucun e-mail
          n’est réellement envoyé (§F1) : le lien de vérification est journalisé dans les logs de
          l’API. Collez le token qu’il contient ci-dessous.
        </p>

        <div className="flex flex-col gap-1">
          <label htmlFor="verify-token" className={LABEL_CLASS}>
            Token de vérification
          </label>
          <input
            id="verify-token"
            name="token"
            type="text"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {error && (
          <p role="alert" className={ERROR_TEXT_CLASS}>
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON_CLASS}>
          {isSubmitting ? 'Vérification…' : 'Valider et se connecter'}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleRegister}
      noValidate
      className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
    >
      <h1 className="text-2xl font-bold text-zinc-900">Inscription</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className={LABEL_CLASS}>
          E-mail
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-password" className={LABEL_CLASS}>
          Mot de passe
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="register-password-hint"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={INPUT_CLASS}
        />
        <p id="register-password-hint" className={HINT_TEXT_CLASS}>
          Au moins {MIN_PASSWORD_LENGTH} caractères.
        </p>
      </div>

      {error && (
        <p role="alert" className={ERROR_TEXT_CLASS}>
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON_CLASS}>
        {isSubmitting ? 'Création…' : 'Créer un compte'}
      </button>

      <p className="text-sm text-zinc-700">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-blue-700 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
