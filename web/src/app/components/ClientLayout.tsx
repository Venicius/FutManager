"use client";

import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNav from "./BottomNav";

function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, loginWithEmail, registerWithEmail, logout, groupName } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
        <p className="text-sm font-medium text-slate-500">A carregar sessão...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-slide-up">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center border-t-2 border-emerald-500 rounded-full bg-emerald-50 mb-4">
              <span className="text-3xl">⚽</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">FutManager</h1>
            <p className="mt-2 text-sm text-slate-500">Faça login para gerir a sua pelada</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              isLogin ? loginWithEmail(email, pass) : registerWithEmail(email, pass);
            }} 
            className="flex flex-col gap-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400" placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Palavra-passe</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder-slate-400" placeholder="••••••••" />
            </div>

            <button type="submit" className="mt-2 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 active:scale-95 hover:bg-emerald-700 transition-all">
              {isLogin ? "Entrar" : "Criar Conta"}
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              {isLogin ? "Não tem uma conta?" : "Já tem conta?"}{" "}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                 {isLogin ? "Registe-se" : "Entrar"}
              </button>
            </p>
          </form>

          <div className="relative my-6 flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="mx-4 flex-shrink-0 text-xs text-slate-400 uppercase tracking-widest">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button onClick={signInWithGoogle} className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Entrar com o Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 md:hidden">
        <span className="text-sm font-bold text-slate-900">⚽ {groupName}</span>
        <button onClick={logout} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Sair da conta</button>
      </header>
      <div className="md:fixed md:top-4 md:right-4 md:z-50 hidden md:block">
         <button onClick={logout} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200 transition-colors">Sair da conta</button>
      </div>

      <BottomNav />
      <main className="mx-auto max-w-3xl pt-16 pb-24 md:pb-8 md:pt-10">
        {children}
      </main>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster position="bottom-center" toastOptions={{ duration: 4000, style: { background: '#334155', color: '#fff', borderRadius: '8px' } }} />
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </AuthProvider>
  );
}
