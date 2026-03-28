import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowRight, Lock, Mail, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callManageTotp } from '@/lib/totp-api';

type LoginStep = 'credentials' | 'totp';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, role, isLoading: authLoading, totpEnabled, totpVerified, setTotpVerified } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<LoginStep>('credentials');

  // Redirect if fully authenticated
  useEffect(() => {
    if (!user || !role) return;
    if (totpEnabled === null) return;
    if (totpEnabled && !totpVerified) return;

    if (!totpEnabled) {
      navigate('/totp-setup');
      return;
    }

    if (role === 'admin') navigate('/admin');
    else if (role === 'agent') navigate('/agent');
    else if (role === 'merchant') navigate('/merchant');
  }, [user, role, totpEnabled, totpVerified, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (step === 'credentials') {
      // Step 1: Sign in with email/password
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Check if user has TOTP enabled
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data: totpData } = await supabase
        .from('user_totp')
        .select('is_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const hasTotpEnabled = totpData?.is_enabled || false;

      if (hasTotpEnabled) {
        // Show TOTP input step
        setStep('totp');
        setIsLoading(false);
        return;
      }

      // No TOTP — useEffect will redirect to /totp-setup
      setIsLoading(false);
      return;
    }

    if (step === 'totp') {
      // Step 2: Verify TOTP code
      if (!totpCode || totpCode.length !== 6) {
        toast({ title: 'Invalid code', description: 'Please enter a valid 6-digit code.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const { data: verifyData, error: verifyError } = await callManageTotp('verify', totpCode);

      if (verifyError || verifyData?.error) {
        toast({
          title: 'Invalid code',
          description: verifyError?.error || verifyData?.error || 'Authentication code is incorrect.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      setTotpVerified(true);
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = async () => {
    await supabase.auth.signOut();
    setStep('credentials');
    setTotpCode('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(hsl(186 100% 50% / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(186 100% 50% / 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Roxpay</h1>
              <p className="text-sm text-muted-foreground">Payment Gateway</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Enterprise-Grade<br />
            <span className="gradient-text">Crypto Payments</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-md mb-8">
            Secure, auditable, and compliant cryptocurrency payment processing 
            for modern businesses.
          </p>
          
          <div className="space-y-4">
            {[
              'Ledger-driven financial accuracy',
              'Multi-coin support with real-time rates',
              'Enterprise security & compliance',
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Roxpay</h1>
              <p className="text-xs text-muted-foreground">Payment Gateway</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {step === 'credentials' ? 'Welcome back' : 'Two-Factor Authentication'}
            </h2>
            <p className="text-muted-foreground">
              {step === 'credentials'
                ? 'Sign in to access your dashboard'
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {step === 'credentials' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 'totp' && (
              <div className="space-y-2">
                <Label htmlFor="totp-code">Authenticator Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="pl-10 text-center tracking-[0.3em] font-mono"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                  />
                </div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : step === 'credentials' ? (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                'Verify & Sign In'
              )}
            </Button>

            {step === 'totp' && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToCredentials}
              >
                Back to Sign In
              </Button>
            )}
          </form>
          
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Need access? Contact your{' '}
            <span className="text-primary">platform administrator</span>
          </p>
        </div>
      </div>
    </div>
  );
}
