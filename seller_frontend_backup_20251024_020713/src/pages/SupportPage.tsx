import { useAuth } from '@/context/AuthContext';

export default function SupportPage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h2>Supporto venditori</h2>
      <p className="helper">
        Hai bisogno di assistenza? Contatta il referente del tuo team oppure apri un ticket tramite l&apos;area admin.
      </p>
      <ul className="referral-tips">
        <li>Email supporto interno: <strong>support@allyoucanleads.com</strong></li>
        <li>Slack: canale <strong>#aycl-seller</strong></li>
        <li>Account collegato: {user?.email}</li>
      </ul>
    </section>
  );
}
