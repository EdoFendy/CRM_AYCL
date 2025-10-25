import { ReferralCard, CheckoutsSection } from '../features/kit/sections';

export default function ReferralPage() {
  return (
    <div className="grid gap-6">
      <ReferralCard />
      <section className="card">
        <h2>Come usare il referral</h2>
        <ul className="referral-tips">
          <li>Condividi il link in tutte le comunicazioni con il cliente.</li>
          <li>Genera carrelli e drive test dal Seller Kit: il referral è inserito automaticamente.</li>
          <li>Monitora i checkouts aperti per verificare quando il cliente completa il pagamento.</li>
        </ul>
      </section>
      <CheckoutsSection />
    </div>
  );
}
