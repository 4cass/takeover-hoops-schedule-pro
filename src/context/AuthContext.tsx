import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: 'admin' | 'coach' | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'coach' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const fetchSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch role from coaches table
        const { data, error } = await supabase
          .from("coaches")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error.message);
          setRole(null); // Handle missing record or column
        } else {
          setRole(data?.role || null);
        }
      }

      setLoading(false);
    };

    fetchSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data, error } = await supabase
          .from("coaches")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error.message);
          setRole(null);
        } else {
          setRole(data?.role || null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);