import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'merchant' | 'agent' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  merchantId: string | null;
  agentId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    // Check for admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      setRole('admin');
      setMerchantId(null);
      setAgentId(null);
      return;
    }

    // Check for agent role
    const { data: agentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'agent')
      .maybeSingle();

    if (agentRole) {
      setRole('agent');
      setMerchantId(null);
      
      // Get agent ID
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setAgentId(agent?.id || null);
      return;
    }

    // Check for merchant role
    const { data: merchantRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'merchant')
      .maybeSingle();

    if (merchantRole) {
      setRole('merchant');
      setAgentId(null);
      
      // Get merchant ID
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setMerchantId(merchantUser?.merchant_id || null);
    } else {
      setRole(null);
      setMerchantId(null);
      setAgentId(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid blocking
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else {
          setRole(null);
          setMerchantId(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setMerchantId(null);
    setAgentId(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      merchantId,
      agentId,
      isLoading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
