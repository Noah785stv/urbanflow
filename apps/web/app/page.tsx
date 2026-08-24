import { RouteGuard } from '../components/auth/route-guard';
import { TripPlanner } from '../components/planner/trip-planner';

export default function Home() {
  return (
    <RouteGuard>
      <main className="flex flex-1 flex-col">
        <TripPlanner />
      </main>
    </RouteGuard>
  );
}
