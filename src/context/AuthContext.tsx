
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: 'admin' | 'coach' | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

// Helper function to validate role
const isValidRole = (role: string): role is 'admin' | 'coach' => {
  return role === 'admin' || role === 'coach';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'coach' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const fetchSession = async () => {
      console.log("AuthContext - Fetching session..."); // Debug log
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setLoading(false);
        return;
      }

      console.log("AuthContext - Session:", session); // Debug log
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log("AuthContext - Fetching role for user:", session.user.id); // Debug log
        // Fetch role from coaches table
        const { data, error } = await supabase
          .from("coaches")
          .select("role")
          .eq("id", session.user.id)
          .single();

        console.log("AuthContext - Role query result:", { data, error }); // Debug log

        if (error) {
          console.error("Error fetching role:", error.message);
          setRole(null); // Handle missing record or column
        } else {
          // Validate and set role with proper type checking
          const dbRole = data?.role;
          console.log("AuthContext - DB role:", dbRole); // Debug log
          const validatedRole = dbRole && isValidRole(dbRole) ? dbRole : null;
          console.log("AuthContext - Validated role:", validatedRole); // Debug log
          setRole(validatedRole);
        }
      }

      setLoading(false);
    };

    fetchSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext - Auth state changed:", event, session); // Debug log
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data, error } = await supabase
          .from("coaches")
          .select("role")
          .eq("id", session.user.id)
          .single();

        console.log("AuthContext - Role query result (auth change):", { data, error }); // Debug log

        if (error) {
          console.error("Error fetching role:", error.message);
          setRole(null);
        } else {
          // Validate and set role with proper type checking
          const dbRole = data?.role;
          const validatedRole = dbRole && isValidRole(dbRole) ? dbRole : null;
          console.log("AuthContext - Setting role (auth change):", validatedRole); // Debug log
          setRole(validatedRole);
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

  console.log("AuthContext - Current state:", { user: user?.email, role, loading }); // Debug log

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
