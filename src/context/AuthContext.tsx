// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../supabase/supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import Cookies from "js-cookie";

// Define AuthContext type
interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const storedSession = Cookies.get("supabaseSession");
      if (storedSession) {
        const { session, user, role } = JSON.parse(storedSession);
        setSession(session);
        setUser(user);
        setRole(role);
        setLoading(false);

        console.log("Stored Session", storedSession);

      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
  
          // Fetch role from users table
          const { data, error } = await supabase.from("users").select("role").eq("id", session.user.id).single();
          if (!error && data) {
            setRole(data.role);
            Cookies.set("supabaseSession", JSON.stringify({ session, user: session.user, role: data.role }), { expires: session.expires_in / (60 * 60 * 24) }); // Save session in cookie
          }

          console.log("Fetched Session", session);
          console.log("Fetched Role", data?.role);

        }
        setLoading(false);
      }
    };
  
    fetchUser();
  
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session) {
          setUser(session.user);
          try {
            const { data, error } = await supabase
              .from("users")
              .select("role")
              .eq("id", session.user.id)
              .single();
    
            if (!error && data) {
              setRole(data.role);
              Cookies.set("supabaseSession", JSON.stringify({ session, user: session.user, role: data.role }), { expires: session.expires_in / (60 * 60 * 24) }); // Save session in cookie
            }
            
          } catch (err) {
            console.error("Error fetching role:", err);
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          Cookies.remove("supabaseSession"); // Remove session from cookie
        }
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
