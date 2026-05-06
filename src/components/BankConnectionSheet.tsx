import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Landmark, Loader2, RefreshCw, Trash2, AlertCircle, Search } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);

  const loadBanks = async (name?: string) => {
    const result = await connectBank(name);
    if (result?.needs_bank_selection && Array.isArray(result.banks)) {
      setBankOptions(result.banks);
    }
  };

  // Charge automatiquement la liste à l'ouverture
  useEffect(() => {
    if (open && accountId && bankOptions.length === 0) {
      loadBanks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  const filteredBanks = bankOptions.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

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
                const expired = conn.status === 'expired' || new Date(conn.valid_until) < new Date();
                return (
                  <div key={conn.id} className={`border rounded-2xl p-4 space-y-2 ${expired ? 'bg-destructive/5 border-destructive/40' : 'bg-card'}`}>
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                          <AlertCircle className="w-4 h-4" />
                          Reconnexion nécessaire — ta banque a révoqué l'accès
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={async () => {
                            await disconnectBank(conn.id);
                            loadBanks(conn.bank_name);
                          }}
                        >
                          🔄 Reconnecter {conn.bank_name}
                        </Button>
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

          {/* Liste des banques */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold">
              {connections.length > 0 ? 'Ajouter une banque' : 'Choisis ta banque'}
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (Caisse, BNP, Banxo...)"
                className="pl-9"
              />
            </div>

            {loading && bankOptions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : bankOptions.length === 0 ? (
              <Button onClick={() => loadBanks()} variant="secondary" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" /> Charger la liste des banques
              </Button>
            ) : (
              <div className="rounded-2xl border bg-card p-2">
                <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">
                  {filteredBanks.length} banque{filteredBanks.length > 1 ? 's' : ''} disponible{filteredBanks.length > 1 ? 's' : ''}
                </p>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredBanks.map((bank) => (
                    <Button
                      key={`${bank.country}-${bank.name}`}
                      type="button"
                      variant="secondary"
                      className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                      disabled={loading}
                      onClick={() => {
                        setBankOptions([]);
                        loadBanks(bank.name);
                      }}
                    >
                      {bank.logo && <img src={bank.logo} alt="" className="mr-2 h-5 w-5 shrink-0 object-contain" />}
                      <span className="flex-1">{bank.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{bank.country}</span>
                    </Button>
                  ))}
                  {filteredBanks.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Aucune banque trouvée pour "{search}"
                    </p>
                  )}
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
