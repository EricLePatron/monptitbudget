import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Landmark, Loader2, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useBankConnection } from '@/hooks/useBankConnection';

interface BankOption {
  name: string;
  country: string;
  logo?: string;
}

interface BankConnectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
}

export function BankConnectionSheet({ open, onOpenChange, accountId }: BankConnectionSheetProps) {
  const { connections, loading, syncing, connectBank, syncTransactions, disconnectBank } = useBankConnection(accountId);
  const [bankName, setBankName] = useState('Caisse');
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);

  const handleConnect = async (name = bankName) => {
    const result = await connectBank(name.trim() || undefined);
    if (result?.needs_bank_selection && Array.isArray(result.banks)) {
      setBankOptions(result.banks);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="flex items-center gap-2 text-2xl font-display">
            <Landmark className="w-6 h-6 text-primary" />
            Ma banque
          </SheetTitle>
          <SheetDescription>
            Connecte ton compte bancaire pour importer automatiquement tes dépenses (DSP2 - Enable Banking).
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Connexions existantes */}
          {connections.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Comptes connectés</h3>
              {connections.map((conn) => {
                const expired = new Date(conn.valid_until) < new Date();
                return (
                  <div key={conn.id} className="border rounded-2xl p-4 space-y-2 bg-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{conn.bank_name}</p>
                        {conn.bank_account_iban && (
                          <p className="text-xs text-muted-foreground font-mono">
                            ****{conn.bank_account_iban.slice(-4)}
                          </p>
                        )}
                        {conn.bank_account_name && (
                          <p className="text-xs text-muted-foreground">{conn.bank_account_name}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => disconnectBank(conn.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {expired ? (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Reconnexion nécessaire (DSP2 expirée)
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {conn.last_synced_at
                          ? `Dernière synchro: ${new Date(conn.last_synced_at).toLocaleString('fr-FR')}`
                          : 'Jamais synchronisé'}
                      </p>
                    )}
                  </div>
                );
              })}

              <Button
                onClick={() => syncTransactions(false)}
                disabled={syncing}
                variant="secondary"
                className="w-full"
              >
                {syncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Synchronisation...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Synchroniser maintenant</>
                )}
              </Button>
            </div>
          )}

          {/* Connexion nouvelle */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold">
              {connections.length > 0 ? 'Ajouter une banque' : 'Connecter ma banque'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Nom de la banque (ex: Caisse, BNP, Crédit Agricole)</label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Caisse d'Épargne"
              />
            </div>
            <Button onClick={() => handleConnect()} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion...</>
              ) : (
                <><Landmark className="w-4 h-4 mr-2" /> Se connecter à ma banque</>
              )}
            </Button>
            {bankOptions.length > 0 && (
              <div className="space-y-2 rounded-2xl border bg-card p-3">
                <p className="text-xs font-semibold text-muted-foreground">Choisis ta banque exacte</p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {bankOptions.map((bank) => (
                    <Button
                      key={`${bank.country}-${bank.name}`}
                      type="button"
                      variant="secondary"
                      className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                      disabled={loading}
                      onClick={() => {
                        setBankName(bank.name);
                        setBankOptions([]);
                        handleConnect(bank.name);
                      }}
                    >
                      {bank.logo && <img src={bank.logo} alt="" className="mr-2 h-5 w-5 shrink-0" />}
                      <span>{bank.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              🔒 Connexion sécurisée DSP2. Aucun mot de passe stocké. Reconnexion tous les 180 jours.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
