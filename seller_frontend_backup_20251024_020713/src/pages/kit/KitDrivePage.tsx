import { ReferralCard, DriveTestSection, CheckoutsSection } from '@/features/kit/sections';

export default function KitDrivePage() {
  return (
    <div className="grid gap-6">
      <ReferralCard />
      <DriveTestSection />
      <CheckoutsSection />
    </div>
  );
}
