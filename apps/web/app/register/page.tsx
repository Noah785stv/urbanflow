import type { Metadata } from 'next';
import { RegisterForm } from '../../components/auth/register-form';

export const metadata: Metadata = {
  title: 'Inscription — UrbanFlow Mobility',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50">
      <RegisterForm />
    </main>
  );
}
