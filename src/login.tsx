import { useState } from 'react';
// @ts-ignore
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // Registrazione: il nickname viene salvato nei metadata dell'utente
        const { error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: { nickname: nickname }
          }
        });
        if (error) throw error;
        alert('Registrazione riuscita! Controlla la mail o prova ad accedere.');
        setIsRegistering(false);
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>{isRegistering ? 'Crea il tuo profilo' : 'Accedi al Fantaschedone'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {isRegistering && (
          <input 
            type="text" 
            placeholder="Nickname" 
            value={nickname} 
            onChange={e => setNickname(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
            required 
          />
        )}
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          required 
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          {loading ? 'Attendere...' : (isRegistering ? 'REGISTRATI' : 'ACCEDI')}
        </button>
      </form>
      <p onClick={() => setIsRegistering(!isRegistering)} style={{ cursor: 'pointer', color: '#007bff', marginTop: '20px' }}>
        {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo utente? Registrati'}
      </p>
    </div>
  );
}