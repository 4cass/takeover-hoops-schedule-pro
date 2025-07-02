
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

  const fetchUserRole = async (currentUser: User) => {
    try {
      // First try to match by auth_id
      let { data, error } = await supabase
        .from("coaches")
        .select("role")
        .eq("auth_id", currentUser.id)
        .single();

      // If no match by auth_id, try to match by email
      if (error || !data) {
        console.log("No match by auth_id, trying email match...");
        const { data: emailData, error: emailError } = await supabase
          .from("coaches")
          .select("role")
          .eq("email", currentUser.email)
          .single();
        
        data = emailData;
        error = emailError;
        
        // If we found a match by email, update the auth_id for future queries
        if (emailData && !emailError) {
          console.log("Found coach by email, updating auth_id...");
          await supabase
            .from("coaches")
            .update({ auth_id: currentUser.id })
            .eq("email", currentUser.email);
        }
      }

      if (error) {
        console.error("Error fetching role:", error.message);
        setRole(null);
      } else {
        // Validate and set role with proper type checking
        const dbRole = data?.role;
        console.log("Fetched role from database:", dbRole);
        setRole(dbRole && isValidRole(dbRole) ? dbRole : null);
      }
    } catch (error) {
      console.error("Exception while fetching role:", error);
      setRole(null);
    }
  };

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
        await fetchUserRole(session.user);
      }

      setLoading(false);
    };

    fetchSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRole(session.user);
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
