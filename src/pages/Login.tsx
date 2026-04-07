import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Ministry of Aesthetics" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Ministry of Aesthetics</h1>
          <p className="text-sm text-gray-500 mt-1">Prijavite se na svoj nalog</p>
        </div>

        {/* Forma */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="vas@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Lozinka"
            type="password"
            placeholder="Unesite lozinku"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Prijavi se
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ministry of Aesthetics v1.0
        </p>
      </div>
    </div>
  );
}
