'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../lib/api-client';
import { ERROR_TEXT_CLASS, INPUT_CLASS, LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '../../lib/styles';

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Connexion impossible. Réessayez.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
    >
      <h1 className="text-2xl font-bold text-zinc-900">Connexion</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className={LABEL_CLASS}>
          E-mail
        </label>
        <input
          id="login-email"
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
        <label htmlFor="login-password" className={LABEL_CLASS}>
          Mot de passe
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {error && (
        <p role="alert" className={ERROR_TEXT_CLASS}>
          {error}
        </p>
      )}

      <button type="submit" disabled={isLoading} className={PRIMARY_BUTTON_CLASS}>
        {isLoading ? 'Connexion en cours…' : 'Se connecter'}
      </button>

      <p className="text-sm text-zinc-700">
        Pas de compte ?{' '}
        <Link href="/register" className="font-medium text-blue-700 underline">
          S’inscrire
        </Link>
      </p>
    </form>
  );
}
