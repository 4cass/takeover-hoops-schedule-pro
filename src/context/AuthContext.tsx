
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: 'admin' | 'coach' | null;
  coachData: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  coachData: null,
  loading: true 
});

// Helper function to validate role
const isValidRole = (role: string): role is 'admin' | 'coach' => {
  return role === 'admin' || role === 'coach';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'coach' | null>(null);
  const [coachData, setCoachData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (currentUser: User) => {
    try {
      console.log("Fetching role for user:", currentUser.email);
      
      // Try to find the user in coaches table by auth_id first, then by email
      let { data: coachRecord, error: coachError } = await supabase
        .from("coaches")
        .select("*")
        .eq("auth_id", currentUser.id)
        .maybeSingle();

      // If not found by auth_id, try by email
      if (!coachRecord && !coachError) {
        const { data: emailRecord, error: emailError } = await supabase
          .from("coaches")
          .select("*")
          .eq("email", currentUser.email)
          .maybeSingle();
        
        coachRecord = emailRecord;
        coachError = emailError;
      }

      if (coachError) {
        console.error("Error fetching coach record:", coachError);
        setRole(null);
        setCoachData(null);
        return;
      }

      if (coachRecord) {
        console.log("Found coach record:", coachRecord);
        
        // Update auth_id if it's missing
        if (!coachRecord.auth_id) {
          console.log("Updating auth_id for coach...");
          const { error: updateError } = await supabase
            .from("coaches")
            .update({ auth_id: currentUser.id })
            .eq("id", coachRecord.id);
          
          if (updateError) {
            console.error("Error updating auth_id:", updateError);
          } else {
            coachRecord.auth_id = currentUser.id;
          }
        }

        const dbRole = coachRecord.role;
        if (dbRole && isValidRole(dbRole)) {
          setRole(dbRole);
          setCoachData(coachRecord);
          console.log("Set role to:", dbRole, "Coach data:", coachRecord);
        } else {
          console.log("Invalid role in database:", dbRole);
          setRole(null);
          setCoachData(null);
        }
      } else {
        console.log("No coach record found for user");
        setRole(null);
        setCoachData(null);
      }
    } catch (error) {
      console.error("Exception while fetching role:", error);
      setRole(null);
      setCoachData(null);
    }
  };

  useEffect(() => {
    // Check current session
    const fetchSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Error fetching session:", sessionError.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user);
        } else {
          setUser(null);
          setRole(null);
          setCoachData(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in fetchSession:", error);
        setUser(null);
        setRole(null);
        setCoachData(null);
        setLoading(false);
      }
    };

    fetchSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user);
      } else {
        setUser(null);
        setRole(null);
        setCoachData(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, coachData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
