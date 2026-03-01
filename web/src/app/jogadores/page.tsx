"use client";

import { useState, useEffect } from "react";
import { getPlayers, addPlayer, updatePlayer, Jogador, TipoVinculo, StatusJogador } from "@/services/player.service";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────
function formatarWhatsApp(raw: string): string {
  if (raw.length === 11) return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  return raw;
}

function aplicarMascaraWhatsApp(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

// ── Componentes ────────────────────────────────────────────

function CardJogador({ jogador, onEdit }: { jogador: Jogador, onEdit: (j: Jogador) => void }) {
  const ativo = jogador.status === "Ativo";

  return (
    <button 
      onClick={() => onEdit(jogador)}
      className={`w-full text-left flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${!ativo ? "opacity-50" : ""}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base font-bold text-emerald-700">
        {jogador.nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900 leading-tight">{jogador.nome}</p>
        <p className="mt-0.5 text-xs text-slate-400">{formatarWhatsApp(jogador.whatsapp)}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {jogador.vinculo}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            ativo ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}>
            <span className="text-[9px]">●</span>
            {jogador.status}
          </span>
        </div>
      </div>
    </button>
  );
}

function ModalNovoJogador({ aberto, onFechar, onSalvo, jogadorEdit }: { aberto: boolean; onFechar: () => void; onSalvo: () => void; jogadorEdit: Jogador | null }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [vinculo, setVinculo] = useState<TipoVinculo>("Mensalista");
  const [status, setStatus] = useState<StatusJogador>("Ativo");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (jogadorEdit && aberto) {
      setNome(jogadorEdit.nome);
      setWhatsapp(aplicarMascaraWhatsApp(jogadorEdit.whatsapp));
      setVinculo(jogadorEdit.vinculo);
      setStatus(jogadorEdit.status);
    } else if (aberto) {
      setNome(""); setWhatsapp(""); setVinculo("Mensalista"); setStatus("Ativo");
    }
  }, [jogadorEdit, aberto]);

  if (!aberto) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    
    setSalvando(true);
    try {
      const isEditing = !!jogadorEdit?.id;
      const parsedData = {
        nome: nome.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        vinculo,
        status
      };

      const req = isEditing ? updatePlayer(jogadorEdit.id!, parsedData) : addPlayer(parsedData).then(() => {});

      await toast.promise(
        req,
        {
          loading: isEditing ? 'A atualizar jogador...' : 'A guardar jogador...',
          success: isEditing ? 'Jogador atualizado com sucesso!' : 'Jogador adicionado ao elenco!',
          error: isEditing ? 'Erro ao atualizar jogador. Pode haver duplicidade de WhatsApp.' : 'Erro ao guardar jogador. Tente novamente.',
        }
      );
      
      onSalvo(); // Recarrega a lista
      onFechar();
    } catch (error: any) {
      console.error("Erro ao salvar jogador:", error);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">{jogadorEdit?.id ? "Editar Jogador" : "Novo Jogador"}</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Nome completo</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" disabled={salvando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">WhatsApp</label>
            <input type="tel" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(aplicarMascaraWhatsApp(e.target.value))} placeholder="(11) 99999-9999" disabled={salvando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Vínculo</label>
            <div className="grid grid-cols-2 gap-3">
              {(["Mensalista", "Diarista"] as TipoVinculo[]).map((tipo) => (
                <button key={tipo} type="button" onClick={() => setVinculo(tipo)} disabled={salvando}
                  className={`rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                    vinculo === tipo
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200"
                  }`}>
                  {tipo === "Mensalista" ? "📅 " : "🎟️ "}{tipo}
                </button>
              ))}
            </div>
          </div>
          {jogadorEdit?.id && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500">Status</label>
              <div className="grid grid-cols-2 gap-3">
                {(["Ativo", "Inativo"] as StatusJogador[]).map((st) => (
                  <button key={st} type="button" onClick={() => setStatus(st)} disabled={salvando}
                    className={`rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                      status === st
                        ? st === "Ativo" ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-rose-600 text-white shadow-md shadow-rose-200"
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}>
                    {st === "Ativo" ? "🟢 Ativo" : "🔴 Inativo"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={onFechar} disabled={salvando} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-500 transition-all active:scale-95 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all active:scale-95 hover:bg-emerald-700 disabled:opacity-70">
              {salvando ? "A salvar..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página Elenco ──────────────────────────────────────────
export default function ElencoPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [jogadorEditing, setJogadorEditing] = useState<Jogador | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarJogadores() {
    setLoading(true);
    try {
      const data = await getPlayers();
      setJogadores(data);
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch inicial
  useEffect(() => {
    carregarJogadores();
  }, []);

  const ativos = jogadores.filter((j) => j.status === "Ativo");
  const inativos = jogadores.filter((j) => j.status === "Inativo");

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-4 pt-6 md:pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">👥 Elenco</h1>
        {!loading && (
          <p className="mt-0.5 text-sm text-slate-500">{jogadores.length} jogadores · {ativos.length} ativos</p>
        )}
      </header>

      {loading ? (
        <section className="mt-8 px-4 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-sm font-medium text-slate-500">A carregar elenco...</p>
          <div className="mt-6 w-full space-y-3">
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200"></div>
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200"></div>
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200"></div>
          </div>
        </section>
      ) : jogadores.length === 0 ? (
        <section className="mt-12 px-4 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl mb-4">🪹</div>
          <h2 className="text-lg font-bold text-slate-900">Elenco Vazio</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">Ainda não há jogadores cadastrados. Toque no botão abaixo para adicionar o primeiro atleta.</p>
        </section>
      ) : (
        <>
          <section className="mt-2 px-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ativos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {ativos.map((j) => <CardJogador key={j.id} jogador={j} onEdit={(jogador) => { setJogadorEditing(jogador); setModalAberto(true); }} />)}
            </div>
          </section>

          {inativos.length > 0 && (
            <section className="mt-8 px-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Inativos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {inativos.map((j) => <CardJogador key={j.id} jogador={j} onEdit={(jogador) => { setJogadorEditing(jogador); setModalAberto(true); }} />)}
              </div>
            </section>
          )}
        </>
      )}

      <button onClick={() => { setJogadorEditing(null); setModalAberto(true); }}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-10 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all active:scale-90 hover:bg-emerald-700">
        <span className="text-lg">+</span> Novo Jogador
      </button>

      <ModalNovoJogador aberto={modalAberto} onFechar={() => setModalAberto(false)} onSalvo={carregarJogadores} jogadorEdit={jogadorEditing} />
    </div>
  );
}
