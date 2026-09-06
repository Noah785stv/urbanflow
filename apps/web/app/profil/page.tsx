import { RouteGuard } from '../../components/auth/route-guard';
import { ProfilePage } from '../../components/profile/profile-page';

export default function Profil() {
  return (
    <RouteGuard>
      <main className="flex flex-1 flex-col">
        <ProfilePage />
      </main>
    </RouteGuard>
  );
}
