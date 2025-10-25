import { ProductCreatorSection, ProductsTableSection, ReferralCard } from '@/features/kit/sections';

export default function KitProductsPage() {
  return (
    <div className="grid gap-6">
      <ReferralCard />
      <ProductCreatorSection />
      <ProductsTableSection />
    </div>
  );
}
