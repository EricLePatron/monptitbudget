import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BankCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Connexion refusée: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Code d\'autorisation manquant');
        return;
      }

      const accountId = sessionStorage.getItem('bank_connecting_account');
      if (!accountId) {
        setStatus('error');
        setMessage('Compte introuvable. Réessayez depuis l\'app.');
        return;
      }

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke('bank-callback', {
          body: { code, account_id: accountId },
        });
        if (invokeErr) throw invokeErr;
        if (data?.error) throw new Error(data.error);

        sessionStorage.removeItem('bank_connecting_account');
        setStatus('success');
        setMessage(`Banque connectée ! ${data?.connections?.length || 0} compte(s) détecté(s).`);
        setTimeout(() => navigate('/'), 2000);
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    };

    handleCallback();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-display font-bold">Connexion en cours...</h1>
            <p className="text-muted-foreground">On finalise la liaison avec votre banque 🏦</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <h1 className="text-2xl font-display font-bold">C'est connecté ! 🎉</h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirection automatique...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-destructive" />
            <h1 className="text-2xl font-display font-bold">Oups...</h1>
            <p className="text-muted-foreground break-words">{message}</p>
            <Button onClick={() => navigate('/')}>Retour à l'app</Button>
          </>
        )}
      </div>
    </div>
  );
}
