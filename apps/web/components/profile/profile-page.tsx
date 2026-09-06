'use client';

import { TransportMode } from '@urbanflow/shared-types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../lib/api-client';
import * as authApi from '../../lib/auth-api';
import type { CurrentUser } from '../../lib/auth-api';
import { MODE_LABELS } from '../../lib/mode-labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { FOCUS_RING } from '../ui/tokens';

type Status = 'loading' | 'ready' | 'error';
type DeleteStep = 'idle' | 'confirm';

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  citizen: 'Citoyen',
  premium: 'Premium',
  admin: 'Administrateur',
};

const CHECKBOX_CLASS = `h-5 w-5 rounded border-line-200 ${FOCUS_RING}`;
const FIELDSET_LEGEND_CLASS =
  'text-[13px] font-semibold uppercase tracking-[0.08em] leading-[18px] text-ink-900';
const SECTION_HEADING_CLASS = 'text-[20px] font-semibold leading-[26px] text-ink-900';

function announcementFor(status: Status): string {
  if (status === 'loading') {
    return 'Chargement du profil…';
  }
  if (status === 'error') {
    return 'Le profil est temporairement indisponible.';
  }
  return 'Profil chargé.';
}

/** Page Profil (§4 F1) : informations du compte + édition des préférences de mobilité déjà exposées par `GET/PATCH /users/me`. */
export function ProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  // Formulaire de préférences — initialisé depuis `profile` une fois chargé.
  const [selectedModes, setSelectedModes] = useState<TransportMode[]>([]);
  const [pmr, setPmr] = useState(false);
  const [personalBike, setPersonalBike] = useState(false);
  const [subscriptionsText, setSubscriptionsText] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await authApi.getMe();
        if (cancelled) {
          return;
        }
        setProfile(me);
        setSelectedModes(me.mobilityProfile.preferredModes as TransportMode[]);
        setPmr(me.mobilityProfile.constraints.pmr);
        setPersonalBike(me.mobilityProfile.constraints.personalBike);
        setSubscriptionsText(me.mobilityProfile.transportSubscriptions.join(', '));
        setStatus('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadErrorMessage(
          error instanceof ApiError ? error.message : 'Chargement du profil impossible.',
        );
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleMode(mode: TransportMode) {
    setSelectedModes((current) =>
      current.includes(mode) ? current.filter((value) => value !== mode) : [...current, mode],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);
    try {
      const transportSubscriptions = subscriptionsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const updated = await authApi.updateProfile({
        preferredModes: selectedModes,
        constraints: { pmr, personalBike },
        transportSubscriptions,
      });
      setProfile(updated);
      setSubscriptionsText(updated.mobilityProfile.transportSubscriptions.join(', '));
      setSaveMessage({ type: 'success', text: 'Préférences enregistrées.' });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof ApiError ? error.message : 'Enregistrement impossible. Réessayez.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleDeleteConfirm() {
    setDeleteErrorMessage(null);
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      // Le compte n'existe plus côté serveur : on nettoie la session locale
      // comme une déconnexion classique (jetons en mémoire, cache du dernier
      // trajet — §9 durcissement) puis on redirige.
      await logout();
      router.push('/login');
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof ApiError ? error.message : 'Suppression impossible. Réessayez.',
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Mon profil</h1>

      <p role="status" className="sr-only">
        {announcementFor(status)}
      </p>

      {status === 'loading' && <p className="text-sm text-ink-600">Chargement…</p>}

      {status === 'error' && loadErrorMessage && (
        <p role="alert" className="text-sm font-medium text-alert-600">
          {loadErrorMessage}
        </p>
      )}

      {status === 'ready' && profile && (
        <>
          <section aria-labelledby="account-info-heading">
            <Card>
              <h2 id="account-info-heading" className={SECTION_HEADING_CLASS}>
                Informations du compte
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-[15px] sm:grid-cols-2">
                <div>
                  <dt className="text-ink-600">E-mail</dt>
                  <dd className="font-medium text-ink-900">{profile.email}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Statut</dt>
                  <dd className="font-medium text-ink-900">
                    {profile.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Rôle</dt>
                  <dd className="font-medium text-ink-900">{ROLE_LABELS[profile.role]}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Membre depuis</dt>
                  <dd className="font-medium text-ink-900">
                    {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
                  </dd>
                </div>
              </dl>
            </Card>
          </section>

          <section aria-labelledby="preferences-heading">
            <Card>
              <h2 id="preferences-heading" className={SECTION_HEADING_CLASS}>
                Préférences de mobilité
              </h2>

              <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-col gap-5">
                <fieldset className="flex flex-col gap-1">
                  <legend className={FIELDSET_LEGEND_CLASS}>Modes préférés</legend>
                  <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {Object.values(TransportMode).map((mode) => (
                      <label
                        key={mode}
                        className="flex items-center gap-2 rounded px-1 py-1.5 text-[15px] text-ink-900"
                      >
                        <input
                          type="checkbox"
                          checked={selectedModes.includes(mode)}
                          onChange={() => toggleMode(mode)}
                          className={CHECKBOX_CLASS}
                        />
                        {MODE_LABELS[mode]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-1">
                  <legend className={FIELDSET_LEGEND_CLASS}>Contraintes</legend>
                  <label className="mt-2 flex items-center gap-2 rounded px-1 py-1.5 text-[15px] text-ink-900">
                    <input
                      type="checkbox"
                      checked={pmr}
                      onChange={(event) => setPmr(event.target.checked)}
                      className={CHECKBOX_CLASS}
                    />
                    Personne à mobilité réduite
                  </label>
                  <label className="flex items-center gap-2 rounded px-1 py-1.5 text-[15px] text-ink-900">
                    <input
                      type="checkbox"
                      checked={personalBike}
                      onChange={(event) => setPersonalBike(event.target.checked)}
                      className={CHECKBOX_CLASS}
                    />
                    Vélo personnel
                  </label>
                </fieldset>

                <Input
                  id="profile-subscriptions"
                  name="subscriptions"
                  type="text"
                  label="Abonnements transport"
                  hint="Séparez plusieurs abonnements par une virgule."
                  value={subscriptionsText}
                  onChange={(event) => setSubscriptionsText(event.target.value)}
                />

                {saveMessage && (
                  <p
                    role={saveMessage.type === 'error' ? 'alert' : 'status'}
                    className={`text-sm font-medium ${
                      saveMessage.type === 'error' ? 'text-alert-600' : 'text-brand-green-700'
                    }`}
                  >
                    {saveMessage.type === 'error' ? saveMessage.text : `✓ ${saveMessage.text}`}
                  </p>
                )}

                <Button type="submit" disabled={isSaving} className="self-start">
                  {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Card>
          </section>

          <section aria-labelledby="account-actions-heading">
            <Card>
              <h2 id="account-actions-heading" className={SECTION_HEADING_CLASS}>
                Gestion du compte
              </h2>

              <div className="mt-3 flex flex-col gap-4">
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    Se déconnecter
                  </Button>
                </div>

                <div className="flex flex-col gap-3 border-t border-line-200 pt-4">
                  {deleteStep === 'idle' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDeleteStep('confirm')}
                    >
                      Supprimer mon compte
                    </Button>
                  ) : (
                    <>
                      <p role="alert" className="text-sm font-medium text-alert-600">
                        Cette action est définitive et immédiate : votre compte et l’historique de
                        vos trajets seront supprimés sans délai. Confirmez-vous ?
                      </p>
                      {deleteErrorMessage && (
                        <p role="alert" className="text-sm font-medium text-alert-600">
                          {deleteErrorMessage}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="danger"
                          disabled={isDeleting}
                          onClick={() => {
                            void handleDeleteConfirm();
                          }}
                        >
                          {isDeleting ? 'Suppression…' : 'Confirmer la suppression'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isDeleting}
                          onClick={() => {
                            setDeleteStep('idle');
                            setDeleteErrorMessage(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
