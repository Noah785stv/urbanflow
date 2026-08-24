import { RouteGuard } from '../../components/auth/route-guard';
import { CarbonDashboard } from '../../components/dashboard/carbon-dashboard';

export default function Dashboard() {
  return (
    <RouteGuard>
      <main className="flex flex-1 flex-col">
        <CarbonDashboard />
      </main>
    </RouteGuard>
  );
}
