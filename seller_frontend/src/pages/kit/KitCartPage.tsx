import { ReferralCard, CartBuilderSection, CheckoutsSection } from '../../features/kit/sections';

export default function KitCartPage() {
  return (
    <div className="grid gap-6">
      <ReferralCard />
      <CartBuilderSection />
      <CheckoutsSection />
    </div>
  );
}
