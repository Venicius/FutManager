"use client";

import { useState, useEffect } from "react";
import { getAdmins, addAdmin, removeAdmin, Admin, AdminRole } from "@/services/admin.service";
import { getUserProfile, updateUserProfile, UserProfile } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function ConfiguracoesPage() {
  const { user, activeTenantId, userRole } = useAuth();
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [novoEmail, setNovoEmail] = useState("");
  const [novaRole, setNovaRole] = useState<AdminRole>("editor");
  const [salvando, setSalvando] = useState(false);

  // Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [telefoneUsuario, setTelefoneUsuario] = useState("");
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  async function carregarDados() {
    if (!user || !activeTenantId) return;
    setLoading(true);
    try {
      const [adminsData, profileData] = await Promise.all([
        getAdmins(activeTenantId),
        getUserProfile(user.uid)
      ]);
      setAdmins(adminsData);
      setProfile(profileData);
      if (profileData) {
        setNomeUsuario(profileData.nome || "");
        setTelefoneUsuario(profileData.telefone || "");
        setNomeGrupo(profileData.nomeGrupo || "");
      }
    } catch (error) {
      console.error("Erro ao carregar co-gestores:", error);
      toast.error("Falha ao carregar lista de acessos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && activeTenantId) carregarDados();
  }, [user, activeTenantId]);

  async function handleSalvarPerfil(e: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user || salvandoPerfil) return;
    setSalvandoPerfil(true);
    
    try {
      await toast.promise(
        updateUserProfile(user.uid, { 
          nome: nomeUsuario.trim(), 
          telefone: telefoneUsuario.replace(/\D/g, ""),
          nomeGrupo: nomeGrupo.trim()
        }),
        {
          loading: "Salvando perfil...",
          success: "Perfil atualizado com sucesso!",
          error: "Erro ao atualizar perfil."
        }
      );
    } catch (error) {
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!novoEmail.trim() || salvando || !activeTenantId) return;

    setSalvando(true);
    try {
      await toast.promise(
        addAdmin(activeTenantId, novoEmail, novaRole),
        {
          loading: "Adicionando co-gestor...",
          success: "Acesso concedido com sucesso!",
          error: (err) => err.message || "Erro ao adicionar."
        }
      );
      setNovoEmail("");
      setNovaRole("editor");
      // Atualiza apenas a lista de admins para não apagar inputs do form de perfil à toa:
      const adm = await getAdmins(activeTenantId);
      setAdmins(adm);
    } catch (error) {
      console.error(error);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemove(id: string, email: string) {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de ${email}?`) || !activeTenantId) return;

    try {
      await toast.promise(
        removeAdmin(activeTenantId, id),
        {
          loading: "Removendo acesso...",
          success: "Acesso removido com sucesso!",
          error: "Erro ao remover co-gestor."
        }
      );
      setAdmins(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-2 pt-6 md:pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">⚙️ Ajustes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Painel de controle e co-gestão
        </p>
      </header>

      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Meu Perfil</h2>
          <p className="text-xs text-slate-500 mb-5">
            Dados do responsável pela organização da pelada.
          </p>
          
          <form className="flex flex-col gap-4" onSubmit={handleSalvarPerfil}>
            <div>
               <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                 E-mail da Conta
               </label>
               <input type="email" value={user?.email || ""} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-sm text-slate-500 cursor-not-allowed" />
            </div>
            <div>
               <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                 Seu Nome
               </label>
               <input type="text" value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} disabled={salvandoPerfil} required placeholder="Ex: João Silva" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" />
            </div>
            <div>
               <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                 WhatsApp / Fone
               </label>
               <input type="tel" value={telefoneUsuario} onChange={(e) => setTelefoneUsuario(e.target.value)} disabled={salvandoPerfil} required placeholder="(11) 99999-9999" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" />
            </div>
            <div>
               <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                 Nome do Grupo / Pelada
               </label>
               <input type="text" value={nomeGrupo} onChange={(e) => setNomeGrupo(e.target.value)} disabled={salvandoPerfil} required placeholder="Ex: Futebol de Quinta" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" />
            </div>

            <button type="submit" disabled={salvandoPerfil} className="mt-2 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50 hover:bg-emerald-700">
              {salvandoPerfil ? "A salvar..." : "Salvar Perfil"}
            </button>
          </form>
        </div>

        {userRole === "owner" && (
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Adicionar Co-gestor</h2>
            <p className="text-xs text-slate-500 mb-5">
              Dê acesso à pelada para outros organizadores. Eles farão login com a conta Google usando este e-mail.
            </p>

            <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                E-mail Google
              </label>
              <input 
                type="email" 
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                placeholder="amigo@gmail.com"
                disabled={salvando}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nível de Acesso
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNovaRole("editor")}
                  disabled={salvando}
                  className={`flex-1 rounded-xl py-3 text-xs font-semibold transition-all ${
                    novaRole === "editor" 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                      : "bg-slate-50 text-slate-500 border border-slate-200 active:scale-95"
                  }`}
                >
                  📝 Editor
                </button>
                <button
                  type="button"
                  onClick={() => setNovaRole("admin")}
                  disabled={salvando}
                  className={`flex-1 rounded-xl py-3 text-xs font-semibold transition-all ${
                    novaRole === "admin" 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                      : "bg-slate-50 text-slate-500 border border-slate-200 active:scale-95"
                  }`}
                >
                  👑 Administrador
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={salvando || !novoEmail.trim()}
              className="mt-2 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800"
            >
              {salvando ? "A conceder acesso..." : "Conceder Acesso"}
            </button>
          </form>
        </div>
        )}

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Acessos Ativos ({admins.length})
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"></div>
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
            Nenhum co-gestor configurado.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {admins.map(admin => {
              const isMe = user?.email?.toLowerCase() === admin.email.toLowerCase();
              return (
                <div key={admin.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      admin.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {admin.role === "admin" ? "👑" : "📝"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 flex items-center gap-2">
                        {admin.email}
                        {isMe && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">Você</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 capitalize">
                        {admin.role} · desde {new Date(admin.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  
                  {!isMe && (
                    <button
                      onClick={() => handleRemove(admin.id!, admin.email)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition-all active:scale-90 hover:bg-rose-100 hover:text-rose-600"
                      title="Remover acesso"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-center">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
