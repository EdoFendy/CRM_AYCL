import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const loginSchema = z.object({
  code11: z
    .string()
    .min(11, 'Inserisci il codice a 11 cifre')
    .max(11, 'Inserisci il codice a 11 cifre'),
  password: z.string().min(8, 'La password deve contenere almeno 8 caratteri')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      code11: '',
      password: ''
    }
  });

  if (isAuthenticated) {
    const redirect = (location.state as { from?: string } | undefined)?.from ?? '/';
    return <Navigate to={redirect} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    await login(values);
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <h1>AYCL Seller Portal</h1>
          <p>Accedi con il codice seller fornito dall&apos;amministratore.</p>
        </div>

        <form className="grid" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="label" htmlFor="code11">
              Codice Seller (11 cifre)
            </label>
            <input
              id="code11"
              className="input"
              placeholder="Es. SEL00000001"
              {...register('code11')}
              autoComplete="username"
              inputMode="numeric"
            />
            {errors.code11 ? <p className="error-text">{errors.code11.message}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Password"
              {...register('password')}
              autoComplete="current-password"
            />
            {errors.password ? <p className="error-text">{errors.password.message}</p> : null}
          </div>

          <button className="button" type="submit" disabled={isSubmitting || loading}>
            {isSubmitting || loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}
