'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Connexion</h1>

      <Input
        id="login-email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Input
        id="login-password"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-alert-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion en cours…' : 'Se connecter'}
      </Button>

      <p className="text-[15px] leading-[24px] text-ink-600">
        Pas de compte ?{' '}
        <Link href="/register" className="font-medium text-brand-blue-700 underline">
          S’inscrire
        </Link>
      </p>
    </form>
  );
}
