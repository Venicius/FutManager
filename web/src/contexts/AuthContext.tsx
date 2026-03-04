"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from "firebase/auth";
import { auth, db, googleProvider } from "@/lib/firebase";
import toast from "react-hot-toast";
import { collection, query, where, getDocs } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeTenantId: string | null;
  userRole: string | null;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && currentUser.email) {
        try {
          const accessRef = collection(db, "tenant_access");
          const q = query(accessRef, where("email", "==", currentUser.email.toLowerCase()));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const docData = snap.docs[0].data();
            setActiveTenantId(docData.ownerUid);
            setUserRole(docData.role);
          } else {
            setActiveTenantId(currentUser.uid);
            setUserRole("owner");
          }
        } catch (error) {
          console.error("Erro ao resolver tenant:", error);
          setActiveTenantId(currentUser.uid);
          setUserRole("owner");
        }
      } else {
        setActiveTenantId(null);
        setUserRole(null);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function signInWithGoogle() {
    try {
      await toast.promise(
        signInWithPopup(auth, googleProvider),
        {
          loading: "A entrar com Google...",
          success: "Login realizado com sucesso!",
          error: "Erro ao autenticar com Google."
        }
      );
    } catch (error: any) {
      console.error(error);
      // Evita o toast duplo erro se for bloqueio de origin
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Ocorreu um problema no login.");
      }
    }
  }

  async function loginWithEmail(email: string, pass: string) {
    try {
      await toast.promise(
        signInWithEmailAndPassword(auth, email, pass),
        {
          loading: "A entrar...",
          success: "Login realizado com sucesso!",
          error: (err) => {
             if(err.code === "auth/invalid-credential") return "E-mail ou senha incorretos.";
             return "Erro ao entrar, tente novamente.";
          }
        }
      );
    } catch (error: any) {
      console.error(error);
    }
  }

  async function registerWithEmail(email: string, pass: string) {
    try {
      await toast.promise(
        createUserWithEmailAndPassword(auth, email, pass),
        {
          loading: "A criar conta...",
          success: "Conta criada e logada com sucesso!",
          error: (err) => {
             if(err.code === "auth/email-already-in-use") return "Este e-mail já está em uso.";
             if(err.code === "auth/weak-password") return "Senha muito fraca, mínimo 6 caracteres.";
             return "Erro ao criar conta, tente novamente.";
          }
        }
      );
    } catch (error: any) {
      console.error(error);
    }
  }

  async function logout() {
    try {
      await firebaseSignOut(auth);
      // toast.success("Sessão encerrada com sucesso"); // Será ativado mas não usaremos promise para Sair pois é instantâneo
    } catch (error) {
       toast.error("Erro ao sair da conta");
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, activeTenantId, userRole, signInWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
