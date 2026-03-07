"use client";

import { useState, useEffect } from "react";
import {
  getPlayers,
  addPlayer,
  updatePlayer,
  promotePlayerToMonthly,
  Jogador,
  TipoVinculo,
  StatusJogador,
} from "@/services/player.service";
import { getPlayerBillings, addRetroactiveBilling, StatusCobranca, Cobranca } from "@/services/billing.service";
import { getPlayerTransactions, Transaction } from "@/services/transaction.service";
import { useAuth } from "@/contexts/AuthContext";
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

type ActiveTab = "elenco" | "espera";

// ── Componentes ────────────────────────────────────────────

function Tabs({ active, onChange }: { active: ActiveTab; onChange: (t: ActiveTab) => void }) {
  return (
    <div className="mx-4 mt-4 flex rounded-2xl bg-slate-100 p-1">
      <button
        onClick={() => onChange("elenco")}
        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
          active === "elenco"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        👥 Elenco Ativo
      </button>
      <button
        onClick={() => onChange("espera")}
        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
          active === "espera"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        🕐 Lista de Espera
      </button>
    </div>
  );
}

function CardJogador({ 
  jogador, 
  onEdit 
}: { 
  jogador: Jogador; 
  onEdit: (j: Jogador) => void;
}) {
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
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              ativo ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
            }`}
          >
            <span className="text-[9px]">●</span>
            {jogador.status}
          </span>
        </div>
      </div>
    </button>
  );
}

function CardEspera({
  jogador,
  onPromote,
  onEdit,
}: {
  jogador: Jogador;
  onPromote: (j: Jogador) => void;
  onEdit: (j: Jogador) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-base font-bold text-amber-700">
          {jogador.nome.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900 leading-tight">{jogador.nome}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatarWhatsApp(jogador.whatsapp)}</p>
        </div>
        <button
          onClick={() => onEdit(jogador)}
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 active:scale-95"
        >
          Editar
        </button>
      </div>
      <button
        onClick={() => onPromote(jogador)}
        className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white shadow-md shadow-amber-200 transition-all hover:bg-amber-600 active:scale-[0.98]"
      >
        ⬆️ Promover a Mensalista
      </button>
    </div>
  );
}

function ModalNovoJogador({
  aberto,
  onFechar,
  onSalvo,
  jogadorEdit,
  onStatement,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
  jogadorEdit: Jogador | null;
  onStatement?: (j: Jogador) => void;
}) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [vinculo, setVinculo] = useState<TipoVinculo>("Mensalista");
  const [status, setStatus] = useState<StatusJogador>("Ativo");
  const [salvando, setSalvando] = useState(false);
  const { activeTenantId } = useAuth();

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
    if (salvando || !activeTenantId) return;

    setSalvando(true);
    try {
      const isEditing = !!jogadorEdit?.id;
      const parsedData = {
        nome: nome.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        vinculo,
        status,
      };

      const req = isEditing
        ? updatePlayer(activeTenantId, jogadorEdit.id!, parsedData)
        : addPlayer(activeTenantId, parsedData).then(() => {});

      await toast.promise(req, {
        loading: isEditing ? "A atualizar jogador..." : "A guardar jogador...",
        success: isEditing ? "Jogador atualizado com sucesso!" : "Jogador adicionado!",
        error: isEditing
          ? "Erro ao atualizar. Pode haver duplicidade de WhatsApp."
          : "Erro ao guardar jogador. Tente novamente.",
      });

      onSalvo();
      onFechar();
    } catch (error: any) {
      console.error("Erro ao salvar jogador:", error);
    } finally {
      setSalvando(false);
    }
  }

  const VINCULOS: { tipo: TipoVinculo; emoji: string }[] = [
    { tipo: "Mensalista", emoji: "📅" },
    { tipo: "Diarista", emoji: "🎟️" },
    { tipo: "Espera", emoji: "🕐" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
          {jogadorEdit?.id ? "Editar Jogador" : "Novo Jogador"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              disabled={salvando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">WhatsApp</label>
            <input
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(aplicarMascaraWhatsApp(e.target.value))}
              placeholder="(11) 99999-9999"
              disabled={salvando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Vínculo</label>
            <div className="grid grid-cols-3 gap-3">
              {VINCULOS.map(({ tipo, emoji }) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setVinculo(tipo)}
                  disabled={salvando}
                  className={`rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                    vinculo === tipo
                      ? tipo === "Espera"
                        ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                        : "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200"
                  }`}
                >
                  {emoji} {tipo}
                </button>
              ))}
            </div>
          </div>
          {jogadorEdit?.id && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500">Status</label>
              <div className="grid grid-cols-2 gap-3">
                {(["Ativo", "Inativo"] as StatusJogador[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    disabled={salvando}
                    className={`rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                      status === st
                        ? st === "Ativo"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                          : "bg-rose-600 text-white shadow-md shadow-rose-200"
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {st === "Ativo" ? "🟢 Ativo" : "🔴 Inativo"}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {jogadorEdit?.id && onStatement && (
            <div className="mt-2 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onStatement(jogadorEdit)}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-50 py-4 text-sm font-black text-emerald-700 border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100 active:scale-[0.98]"
              >
                💰 Financeiro / Cadastrar Pendências
              </button>
              <p className="mt-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesse o histórico de pagamentos e créditos</p>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-500 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all active:scale-95 hover:bg-emerald-700 disabled:opacity-70"
            >
              {salvando ? "A salvar..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalExtrato({
  jogador,
  aberto,
  onFechar,
}: {
  jogador: Jogador | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const { activeTenantId } = useAuth();

  // Form State
  const [valor, setValor] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referencia, setReferencia] = useState("");
  const [status, setStatus] = useState<StatusCobranca>("PAGO");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!activeTenantId || !jogador?.id) return;
    setCarregando(true);
    try {
      const [dataCobrancas, dataTransacoes] = await Promise.all([
        getPlayerBillings(activeTenantId, jogador.id),
        getPlayerTransactions(activeTenantId, jogador.id)
      ]);
      setCobrancas(dataCobrancas);
      setTransacoes(dataTransacoes);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar extrato.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (aberto && jogador) {
      carregar();
      setMostrandoForm(false);
    }
  }, [aberto, jogador]);

  if (!aberto || !jogador) return null;

  async function handleAddRetroactive(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenantId || !jogador?.id || salvando) return;

    setSalvando(true);
    try {
      await toast.promise(
        addRetroactiveBilling(activeTenantId, {
          jogadorId: jogador.id,
          nomeJogador: jogador.nome,
          valor: parseFloat(valor.replace(",", ".")),
          dueDate,
          referencia,
          status,
        }),
        {
          loading: "Salvando histórico...",
          success: "Histórico adicionado!",
          error: "Erro ao salvar.",
        }
      );
      setMostrandoForm(false);
      setValor(""); setDueDate(""); setReferencia("");
      carregar();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-2xl animate-modal-slide rounded-t-3xl md:rounded-3xl bg-white px-5 pb-8 pt-6 md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl shadow-inner">💰</div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Extrato Financeiro</h2>
              <p className="text-sm font-medium text-slate-500">{jogador.nome}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-3 border border-emerald-100/50 shadow-sm transition-all hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-0.5">Crédito Acumulado</p>
            <p className="text-xl font-black text-emerald-700">R$ {(jogador.creditoAcumulado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 custom-scrollbar">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-50 border-t-emerald-500 mb-3" />
              <p className="text-xs font-semibold text-slate-400 animate-pulse uppercase tracking-wider">Carregando histórico...</p>
            </div>
          ) : cobrancas.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-4xl mb-3 opacity-30">📜</p>
              <p className="text-sm font-bold text-slate-400">Nenhum registro encontrado.</p>
              <p className="text-xs text-slate-300 mt-1">Ainda não há lançamentos financeiros para este jogador.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seção de Cobranças Mensais */}
              <section>
                <h3 className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status dos Meses</h3>
                <div className="space-y-2">
                  {cobrancas.map((c) => (
                    <div key={c.id} className="group flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-100 shadow-sm transition-all hover:border-emerald-200">
                      <div className="min-w-0 pr-4">
                        <p className="truncate text-sm font-bold text-slate-900 uppercase tracking-tight">{c.referencia}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Vencimento: {c.dueDate ? new Date(c.dueDate).toLocaleDateString("pt-BR") : "---"}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <p className="text-sm font-black text-slate-900 tracking-tight">R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <span className={`min-w-[80px] text-center rounded-xl px-2.5 py-1.5 text-[9px] font-black tracking-tighter ${
                          c.status === "PAGO" ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" :
                          c.status === "ATRASADO" ? "bg-rose-50 text-rose-600 border border-rose-100/50" :
                          "bg-amber-50 text-amber-600 border border-amber-100/50"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Seção de Histórico de Pagamentos (Transações) */}
              {transacoes.length > 0 && (
                <section>
                  <h3 className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Linha do Tempo (Pagamentos)</h3>
                  <div className="space-y-2">
                    {transacoes.map((t) => (
                      <div key={t.id} className="group flex items-center justify-between rounded-2xl bg-slate-50/50 p-4 border border-slate-100/50 transition-all hover:bg-white hover:border-blue-200">
                        <div className="min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">💳</span>
                            <p className="truncate text-xs font-bold text-slate-700">{t.description}</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(t.date).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-blue-600 tracking-tight">+ R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          {!mostrandoForm ? (
            <div className="flex gap-3">
              <button 
                onClick={onFechar} 
                className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black text-slate-500 transition-all hover:bg-slate-50 active:scale-95"
              >
                Voltar
              </button>
              <button 
                onClick={() => setMostrandoForm(true)} 
                className="flex-[1.5] rounded-2xl bg-slate-900 py-4 text-sm font-black text-white shadow-xl shadow-slate-200 active:scale-95 transition-all hover:bg-slate-800"
              >
                Lançar Histórico Antigo
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddRetroactive} className="animate-fade-in-up bg-slate-50 p-5 rounded-3xl border border-slate-200/50 space-y-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Novo Lançamento Manual</h3>
                <span className="h-1.5 w-8 rounded-full bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400">Referência</label>
                  <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Jan/2026" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300 shadow-sm" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400">Vencimento</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400">Valor (R$)</label>
                  <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300 shadow-sm" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-tighter text-slate-400">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm cursor-pointer">
                    <option value="PAGO">✅ PAGO</option>
                    <option value="PENDENTE">⏳ PENDENTE</option>
                    <option value="ATRASADO">⚠️ ATRASADO</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setMostrandoForm(false)} className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all active:scale-95">CANCELAR</button>
                <button type="submit" disabled={salvando} className="flex-[2] rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">CONFIRMAR LANÇAMENTO</button>
              </div>
            </form>
          )}
        </div>
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("elenco");
  const [jogadorStatement, setJogadorStatement] = useState<Jogador | null>(null);
  const { activeTenantId } = useAuth();

  async function carregarJogadores() {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const data = await getPlayers(activeTenantId);
      setJogadores(data);
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTenantId) carregarJogadores();
  }, [activeTenantId]);

  function handleEdit(jogador: Jogador) {
    setJogadorEditing(jogador);
    setModalAberto(true);
  }

  async function handlePromote(jogador: Jogador) {
    if (!jogador.id || !activeTenantId) return;
    await toast.promise(promotePlayerToMonthly(activeTenantId, jogador.id), {
      loading: `Promovendo ${jogador.nome}...`,
      success: `${jogador.nome} é agora Mensalista! 🎉`,
      error: "Erro ao promover jogador. Tente novamente.",
    });
    carregarJogadores();
  }

  // Separa elenco ativo (Mensalistas + Diaristas) de lista de espera
  const elenco = jogadores.filter((j) => j.vinculo !== "Espera");
  const listaEspera = jogadores.filter((j) => j.vinculo === "Espera");
  const ativos = elenco.filter((j) => j.status === "Ativo");
  const inativos = elenco.filter((j) => j.status === "Inativo");

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-2 pt-6 md:pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">👥 Elenco</h1>
        {!loading && (
          <p className="mt-0.5 text-sm text-slate-500">
            {elenco.length} no elenco · {ativos.length} ativos
            {listaEspera.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                {listaEspera.length} em espera
              </span>
            )}
          </p>
        )}
      </header>

      <Tabs active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <section className="mt-8 px-4 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4" />
          <p className="text-sm font-medium text-slate-500">A carregar elenco...</p>
          <div className="mt-6 w-full space-y-3">
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </section>
      ) : activeTab === "elenco" ? (
        elenco.length === 0 ? (
          <section className="mt-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl mb-4">🪹</div>
            <h2 className="text-lg font-bold text-slate-900">Elenco Vazio</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">
              Ainda não há jogadores cadastrados. Toque no botão abaixo para adicionar o primeiro atleta.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-4 px-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ativos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {ativos.map((j) => (
                  <CardJogador 
                    key={j.id} 
                    jogador={j} 
                    onEdit={handleEdit} 
                  />
                ))}
              </div>
            </section>
            {inativos.length > 0 && (
              <section className="mt-8 px-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Inativos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {inativos.map((j) => (
                    <CardJogador 
                      key={j.id} 
                      jogador={j} 
                      onEdit={handleEdit} 
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )
      ) : (
        // Aba Lista de Espera
        listaEspera.length === 0 ? (
          <section className="mt-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl mb-4">🕐</div>
            <h2 className="text-lg font-bold text-slate-900">Fila Vazia</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">
              Nenhum jogador aguarda na lista de espera no momento.
            </p>
          </section>
        ) : (
          <section className="mt-4 px-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Aguardando vaga · {listaEspera.length} jogador{listaEspera.length !== 1 ? "es" : ""}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {listaEspera.map((j) => (
                <CardEspera 
                  key={j.id} 
                  jogador={j} 
                  onPromote={handlePromote} 
                  onEdit={handleEdit} 
                />
              ))}
            </div>
          </section>
        )
      )}

      <button
        onClick={() => { setJogadorEditing(null); setModalAberto(true); }}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-10 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all active:scale-90 hover:bg-emerald-700"
      >
        <span className="text-lg">+</span> Novo Jogador
      </button>

      <ModalNovoJogador
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvo={carregarJogadores}
        jogadorEdit={jogadorEditing}
        onStatement={(j) => {
          setModalAberto(false);
          setJogadorStatement(j);
        }}
      />

      <ModalExtrato
        aberto={!!jogadorStatement}
        onFechar={() => setJogadorStatement(null)}
        jogador={jogadorStatement}
      />
    </div>
  );
}
