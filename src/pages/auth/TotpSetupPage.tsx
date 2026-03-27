import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TotpSetupPage() {
  const { user, role, session, setTotpVerified } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'loading' | 'qr' | 'done'>('loading');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !session) return;
    initSetup();
  }, [user, session]);

  const initSetup = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('manage-totp', {
        body: { action: 'setup' },
        headers: { Authorization: `Bearer ${currentSession?.access_token}` },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error === 'TOTP already enabled') {
          // Already set up, redirect
          setTotpVerified(true);
          redirectToDashboard();
          return;
        }
        throw new Error(data.error);
      }

      setSecret(data.secret);
      setUri(data.uri);
      setStep('qr');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to initialize TOTP setup', variant: 'destructive' });
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast({ title: 'Error', description: 'Enter a valid 6-digit code', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      const { data: { session: verifySession } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('manage-totp', {
        body: { action: 'verify-setup', code },
        headers: { Authorization: `Bearer ${verifySession?.access_token}` },
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: 'Invalid Code', description: data.error, variant: 'destructive' });
        setIsVerifying(false);
        return;
      }

      setStep('done');
      toast({ title: 'Success', description: 'Authenticator set up successfully!' });

      setTimeout(() => {
        setTotpVerified(true);
        redirectToDashboard();
      }, 1500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Verification failed', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const redirectToDashboard = () => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'agent') navigate('/agent');
    else if (role === 'merchant') navigate('/merchant');
    else navigate('/');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up authenticator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">
            {step === 'done' ? 'Authenticator Linked!' : 'Set Up Google Authenticator'}
          </CardTitle>
          <CardDescription>
            {step === 'done'
              ? 'Your account is now protected with two-factor authentication.'
              : 'Scan the QR code below with your Google Authenticator app to secure your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'qr' && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 rounded-xl border border-border" style={{ backgroundColor: '#ffffff' }}>
                  <QRCodeSVG value={uri} size={200} />
                </div>
              </div>

              {/* Manual secret */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Or enter this key manually:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/50 px-3 py-2 rounded-lg text-xs font-mono break-all select-all">
                    {secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret} className="shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Verification code */}
              <div className="space-y-2">
                <Label>Enter the 6-digit code from your app</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-[0.5em] font-mono"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
