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
import { auth, googleProvider } from "@/lib/firebase";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
