import { ReferralCard, ResourcesSection, CheckoutsSection } from '@/features/kit/sections';

export default function KitResourcesPage() {
  return (
    <div className="grid gap-6">
      <ReferralCard />
      <ResourcesSection />
      <CheckoutsSection />
    </div>
  );
}
