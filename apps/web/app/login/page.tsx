import type { Metadata } from 'next';
import { LoginForm } from '../../components/auth/login-form';

export const metadata: Metadata = {
  title: 'Connexion — UrbanFlow Mobility',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <LoginForm />
    </main>
  );
}
