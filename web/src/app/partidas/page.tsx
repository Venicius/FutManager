"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getMatches, createMatch, updateMatch, deleteMatch, toggleAttendance, type Partida } from "@/services/match.service";
import { getPlayers, type Jogador } from "@/services/player.service";
import { generateMatchBillings } from "@/services/billing.service";
import { useAuth } from "@/contexts/AuthContext";

function fmtPartida(iso: string) {
  const d = new Date(iso);
  return { 
    dia: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }), 
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) 
  };
}

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function futura(iso: string) { return new Date(iso) > new Date(); }

function CardPartida({ p, onClick, onEdit, onDelete }: { p: Partida; onClick: () => void; onEdit: (p: Partida) => void; onDelete: (p: Partida) => void }) {
  const { dia, hora } = fmtPartida(p.data);
  const pres = p.presentPlayers?.length || 0;
  const fut = futura(p.data);
  
  return (
    <div className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all">
      <button onClick={onClick} className="flex flex-1 items-center gap-4 min-w-0 active:scale-[0.98]">
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-center ${fut ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
          <span className="text-lg">⚽</span>
          <span className="text-[10px] font-bold uppercase leading-tight">{dia.split(",")[0]}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-slate-900">{p.titulo}</p>
          <p className="mt-0.5 text-xs text-slate-400">{dia} · {hora}</p>
        </div>
      </button>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900">{pres} pres</span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${fut ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{fut ? "Aberta" : "Encerrada"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 transition-colors">✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">🗑️</button>
        </div>
      </div>
    </div>
  );
}

function ModalNovaPartida({ aberto, onFechar, onSalvo, partidaEdit }: { aberto: boolean; onFechar: () => void; onSalvo: () => void; partidaEdit: Partida | null }) {
  const [titulo, setTitulo] = useState("Pelada de Sábado");
  const [data, setData] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { activeTenantId } = useAuth();

  useEffect(() => {
    if (partidaEdit && aberto) {
      setTitulo(partidaEdit.titulo);
      // slice para arrumar iso no input datetime-local
      setData(new Date(partidaEdit.data).toISOString().slice(0, 16));
    } else if (aberto) {
      setTitulo("Pelada de Sábado");
      setData("");
    }
  }, [partidaEdit, aberto]);
  
  if (!aberto) return null;
  
  async function sub(e: React.FormEvent) { 
    e.preventDefault(); 
    if (salvando || !activeTenantId) return;
    setSalvando(true);
    
    try {
      const isEditing = !!partidaEdit?.id;
      const dataIso = new Date(data).toISOString();

      const req = isEditing ? updateMatch(activeTenantId, partidaEdit.id!, { titulo: titulo.trim(), data: dataIso }) : createMatch(activeTenantId, titulo.trim(), dataIso).then(() => {});

      await toast.promise(
        req,
        {
          loading: isEditing ? 'A atualizar partida...' : 'A criar partida...',
          success: isEditing ? 'Partida atualizada!' : 'Partida criada com sucesso!',
          error: isEditing ? 'Erro ao atualizar partida.' : 'Erro ao criar partida.',
        }
      );

      onSalvo();
      onFechar(); 
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">{partidaEdit?.id ? "Editar Partida" : "Nova Partida"}</h2>
        <form onSubmit={sub} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Título</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Pelada de Sábado" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Data e hora</label>
            <input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" required />
          </div>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={onFechar} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-500 active:scale-95">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 active:scale-95 hover:bg-emerald-700 disabled:opacity-70">{salvando ? "A salvar..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalPresenca({ partida, onFechar, onAtualizar }: { partida: Partida; onFechar: () => void; onAtualizar: () => void }) {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Clonamos a lista de presenças para o estado local para otimizar a atualização da UI optimista
  const [presentesLocal, setPresentesLocal] = useState<string[]>(partida.presentPlayers || []);
  const { activeTenantId } = useAuth();

  useEffect(() => {
    async function carregar() {
      if (!activeTenantId) return;
      try {
        const allPlayers = await getPlayers(activeTenantId);
        // Filtra apenas ativos
        setJogadores(allPlayers.filter(j => j.status === "Ativo"));
      } catch (err) {
        toast.error("Erro ao carregar jogadores");
      } finally {
        setLoading(false);
      }
    }
    if (activeTenantId) carregar();
  }, [activeTenantId]);

  async function handleToggle(jogadorId: string) {
    if (!jogadorId || !partida.id) return;
    
    // Atualização optimista
    const isPresent = presentesLocal.includes(jogadorId);
    const novoStatus = !isPresent;
    
    setPresentesLocal(prev => 
      novoStatus ? [...prev, jogadorId] : prev.filter(id => id !== jogadorId)
    );

    try {
      if (!activeTenantId) return;
      await toggleAttendance(activeTenantId, partida.id, jogadorId, novoStatus);
      toast.success(novoStatus ? "Presença confirmada" : "Falta registrada", { id: "toast-presenca", duration: 2000 });
      onAtualizar(); // Para atualizar a contagem geral
    } catch (e) {
      // Reverter se falhar
      setPresentesLocal(prev => 
        !novoStatus ? [...prev, jogadorId] : prev.filter(id => id !== jogadorId)
      );
      toast.error("Erro ao registrar presença");
    }
  }

  const { dia, hora } = fmtPartida(partida.data);
  const pres = presentesLocal.length;

  const [cobrancaAberta, setCobrancaAberta] = useState(false);
  const [valorAvulso, setValorAvulso] = useState("20");
  const [dataVencimento, setDataVencimento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // 3 dias de prazo por padrão
    return d.toISOString().split('T')[0];
  });

  async function handleCobrar() {
    setCobrancaAberta(false);
    
    const valor = parseFloat(valorAvulso.replace(",", "."));
    if (isNaN(valor)) {
      toast.error("Valor inválido");
      return;
    }

    await toast.promise(
      generateMatchBillings(
        activeTenantId!,
        partida.id as string, 
        partida.titulo, 
        presentesLocal, 
        jogadores, 
        valor, 
        new Date(dataVencimento).toISOString()
      ),
      {
        loading: 'A gerar cobranças...',
        success: 'Cobranças geradas com sucesso!',
        error: 'Erro ao gerar cobranças.',
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4 max-h-[85vh] flex flex-col">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{partida.titulo}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{dia} · {hora} · {pres} confirmados</p>
          </div>
          <button onClick={() => setCobrancaAberta(true)} className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors">
            💰 Cobrar Diaristas
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto -mx-5 px-5 space-y-2.5">
          {loading ? (
             <p className="text-sm text-center text-slate-500 py-4">A carregar atletas...</p>
          ) : (
            jogadores.map((j) => {
              const presente = presentesLocal.includes(j.id as string);
              const diarista = j.vinculo === "Diarista";
              
              return (
                <button key={j.id} onClick={() => handleToggle(j.id as string)} className={`w-full flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition-all ${presente ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${presente ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}>{presente ? "✓" : ""}</div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-slate-900">{j.nome}</p>
                    <p className="text-xs text-slate-400">{j.vinculo}</p>
                  </div>
                  {diarista && presente && <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">Cobrar Avulso</span>}
                </button>
              );
            })
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button onClick={onFechar} className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 active:scale-95 hover:bg-emerald-700">Fechar</button>
        </div>

        {cobrancaAberta && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-fade-in">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Gerar Cobranças (Diaristas)</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Valor da Partida (R$)</label>
                  <input type="number" step="0.01" value={valorAvulso} onChange={(e) => setValorAvulso(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Vencimento</label>
                  <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setCobrancaAberta(false)} className="flex-1 rounded-xl py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCobrar} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartidasPage() {
  const [modalNova, setModalNova] = useState(false);
  const [partidaEditing, setPartidaEditing] = useState<Partida | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenantId } = useAuth();

  async function carregar() {
    if (!activeTenantId) return;
    try {
      const data = await getMatches(activeTenantId);
      setPartidas(data);
    } catch (e) {
      toast.error("Erro ao carregar partidas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTenantId) carregar();
  }, [activeTenantId]);

  async function handleDeleteMatch(p: Partida) {
    if (!p.id || !activeTenantId) return;
    if (!confirm(`Tem certeza que deseja excluir a partida "${p.titulo}"?`)) return;

    try {
      await deleteMatch(activeTenantId, p.id);
      toast.success("Partida excluída com sucesso");
      carregar();
    } catch (e) {
      toast.error("Erro ao excluir partida");
    }
  }

  const sel = partidas.find((p) => p.id === selId) ?? null;

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-4 pt-6 md:pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">📅 Partidas</h1>
        {!loading && <p className="mt-0.5 text-sm text-slate-500">{partidas.length} jogos registrados</p>}
      </header>
      
      {loading ? (
        <section className="mt-8 px-4 flex flex-col items-center justify-center p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-sm font-medium text-slate-500">A carregar...</p>
        </section>
      ) : (
        <>
          <section className="mt-2 px-4">
            <button onClick={() => { setPartidaEditing(null); setModalNova(true); }} className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3.5 text-sm font-semibold text-slate-400 active:scale-[0.98] hover:border-emerald-400 hover:text-emerald-600">+ Nova Partida</button>
          </section>
          
          <section className="mt-5 px-4 mb-24">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Próximas e Recentes</h2>
            
            {partidas.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                 <span className="text-4xl">⚽</span>
                 <p className="mt-4 text-sm font-semibold text-slate-900">Sem partidas</p>
                 <p className="mt-1 text-xs text-slate-500 max-w-[200px]">Organize a próxima pelada!</p>
               </div>
            ) : (
              <div className="flex flex-col gap-3">
                {partidas.map((p) => <CardPartida key={p.id as string} p={p} onClick={() => setSelId(p.id as string)} onEdit={(partida) => { setPartidaEditing(partida); setModalNova(true); }} onDelete={handleDeleteMatch} />)}
              </div>
            )}
          </section>
        </>
      )}

      <ModalNovaPartida aberto={modalNova} onFechar={() => setModalNova(false)} onSalvo={carregar} partidaEdit={partidaEditing} />
      {sel && <ModalPresenca partida={sel} onFechar={() => setSelId(null)} onAtualizar={carregar} />}
    </div>
  );
}
