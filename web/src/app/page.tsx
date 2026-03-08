"use client";

import { useState, useEffect } from "react";
import { getPendingBillings, payBilling, type Cobranca, type StatusCobranca, getPendingPayments, settleMonthlyPayment } from "@/services/billing.service";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboard.service";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { Wallet, ArrowUpCircle, ArrowDownCircle, AlertCircle, TrendingUp, CheckCircle, Calendar } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────
type FiltroAba = "TODOS" | "PENDENTE" | "ATRASADO" | "MENSALIDADES";

const ABAS: { label: string; valor: FiltroAba }[] = [
  { label: "Pendentes", valor: "PENDENTE" },
  { label: "Atrasados", valor: "ATRASADO" },
  { label: "Mensalidades", valor: "MENSALIDADES" },
  { label: "Todos", valor: "TODOS" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function obterCorStatus(status: StatusCobranca) {
  switch (status) {
    case "PAGO":
      return { badge: "bg-emerald-50 text-emerald-700", icon: "✓", border: "border-l-emerald-500" };
    case "ATRASADO":
      return { badge: "bg-rose-50 text-rose-600", icon: "!", border: "border-l-rose-400" };
    case "PENDENTE":
      return { badge: "bg-amber-50 text-amber-600", icon: "⏳", border: "border-l-amber-400" };
  }
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Componentes ────────────────────────────────────────────

function MetricsCards({ metrics, loading }: { metrics: DashboardMetrics | null; loading: boolean }) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-3 gap-3 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const cards = [
    { 
      label: "Entradas", 
      value: metrics.monthlyIncome, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50/50", 
      icon: <ArrowUpCircle className="w-4 h-4" /> 
    },
    { 
      label: "Saídas", 
      value: metrics.monthlyExpense, 
      color: "text-blue-600", 
      bg: "bg-blue-50/50", 
      icon: <ArrowDownCircle className="w-4 h-4" /> 
    },
    { 
      label: "A Receber", 
      value: metrics.totalPending, 
      color: "text-rose-600", 
      bg: "bg-rose-50/50", 
      icon: <AlertCircle className="w-4 h-4" /> 
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm`}>
          <div className={`${card.color} mb-1 opacity-80`}>
            {card.icon}
          </div>
          <p className={`text-sm md:text-lg font-bold truncate w-full ${card.color}`}>
            {formatarMoeda(card.value)}
          </p>
          <p className="mt-0.5 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function BarraAbas({ abaAtiva, onChange }: { abaAtiva: FiltroAba; onChange: (aba: FiltroAba) => void }) {
  return (
    <div className="flex gap-2 px-4">
      {ABAS.map((aba) => {
        const ativo = abaAtiva === aba.valor;
        return (
          <button
            key={aba.valor}
            onClick={() => onChange(aba.valor)}
            className={`flex-1 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 ${
              ativo
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            }`}
          >
            {aba.label}
          </button>
        );
      })}
    </div>
  );
}

function CardCobranca({ cobranca, onPay, isPaying }: { cobranca: Cobranca; onPay: (c: Cobranca) => void; isPaying: boolean }) {
  const cor = obterCorStatus(cobranca.status);
  const podePagar = cobranca.status === "PENDENTE" || cobranca.status === "ATRASADO";

  return (
    <div className={`flex items-center gap-3 rounded-2xl border-l-4 ${cor.border} bg-white p-4 shadow-sm transition-all active:scale-[0.98]`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base font-bold text-slate-700 border border-slate-100">
        {cobranca.nomeJogador.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{cobranca.nomeJogador}</p>
        <p className="mt-0.5 text-xs text-slate-500">{cobranca.vinculo} · {cobranca.referencia}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{formatarMoeda(cobranca.valor)}</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cor.badge}`}>
            {cobranca.status}
          </span>
        </div>
      </div>
      {podePagar && (
        <button 
          onClick={() => onPay(cobranca)}
          disabled={isPaying}
          className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
          aria-label="Registrar Pagamento"
        >
          {isPaying ? "⏳" : "✓"}
        </button>
      )}
    </div>
  );
}

function ModalGerarMensalidades({ aberto, onFechar, onConfirmar, isGenerating }: { aberto: boolean; onFechar: () => void; onConfirmar: (valor: number, vencimento: string) => void; isGenerating: boolean }) {
  const [valor, setValor] = useState(50);
  const [vencimento, setVencimento] = useState("");

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Gerar Mensalidades</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase">Valor Base (R$)</label>
            <input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase">Data de Vencimento</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <button 
            disabled={!vencimento || isGenerating}
            onClick={() => onConfirmar(valor, vencimento)}
            className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? "A gerar..." : "Gerar Agora"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPagamento({ cobranca, aberto, onFechar, onConfirmar, saltando }: { cobranca: Cobranca | null; aberto: boolean; onFechar: () => void; onConfirmar: (valor: number) => void; saltando: boolean }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (cobranca) setValor(cobranca.valor);
  }, [cobranca]);

  if (!aberto || !cobranca) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Registrar Pagamento</h2>
        <p className="mb-4 text-sm text-slate-500">Quanto {cobranca.nomeJogador} está pagando hoje?</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase">Valor Pago (R$)</label>
            <input type="number" autoFocus value={valor} onChange={(e) => setValor(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-emerald-700 outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-3">
             <button onClick={onFechar} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-500">Cancelar</button>
             <button
               disabled={valor <= 0 || saltando}
               onClick={() => onConfirmar(valor)}
               className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
             >
               {saltando ? "⏳" : "Confirmar"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabelaDevedores({ 
  devedores, 
  onSettle, 
  processingId 
}: { 
  devedores: any[]; 
  onSettle: (player: any) => void; 
  processingId: string | null 
}) {
  return (
    <div className="flex flex-col gap-3">
      {devedores.map((player) => {
        const isAtrasado = player.calculatedStatus === "ATRASADO";
        // player.dueDate é uma string ISO enviada pelo serviço
        const dueDate = new Date(player.dueDate);
        
        return (
          <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-50">
            <div className="flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700 font-bold border border-slate-100 uppercase">
                  {player.nome.charAt(0)}
               </div>
               <div>
                 <p className="text-sm font-bold text-slate-900">{player.nome}</p>
                 <div className="flex items-center gap-2 mt-0.5">
                   <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                     isAtrasado ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                   }`}>
                     {isAtrasado ? "Atrasado" : "Pendente"}
                   </span>
                   <span className="text-[10px] text-slate-400 font-medium">
                     Vence: {dueDate.toLocaleDateString('pt-BR')}
                   </span>
                 </div>
               </div>
            </div>
            <button
              onClick={() => onSettle(player)}
              disabled={!!processingId}
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {processingId === player.id ? "⏳" : <CheckCircle className="w-4 h-4" />}
              Baixa
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────
export default function DashboardPendencias() {
  const [abaAtiva, setAbaAtiva] = useState<FiltroAba>("TODOS");
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalGerar, setModalGerar] = useState(false);
  const [selCobranca, setSelCobranca] = useState<Cobranca | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Mensalidades Reconciliation
  const [devedores, setDevedores] = useState<any[]>([]);
  const [mesRelatorio, setMesRelatorio] = useState(new Date().getMonth() + 1);
  const [anoRelatorio, setAnoRelatorio] = useState(new Date().getFullYear());
  const [loadingDevedores, setLoadingDevedores] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const { activeTenantId, groupName } = useAuth();

  async function carregarDados() {
    if (!activeTenantId) return;
    setLoading(true);
    setLoadingMetrics(true);
    try {
      const [data, metricsData] = await Promise.all([
        getPendingBillings(activeTenantId),
        getDashboardMetrics(activeTenantId)
      ]);
      setCobrancas(data);
      setMetrics(metricsData);
      
      // Carregar devedores do mês se estivermos na aba
      if (abaAtiva === "MENSALIDADES") {
        carregarDevedores();
      }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
      setLoadingMetrics(false);
    }
  }

  async function carregarDevedores() {
    if (!activeTenantId) return;
    setLoadingDevedores(true);
    try {
      const data = await getPendingPayments(activeTenantId, mesRelatorio, anoRelatorio);
      setDevedores(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao buscar devedores.");
    } finally {
      setLoadingDevedores(false);
    }
  }

  useEffect(() => {
    if (activeTenantId) carregarDados();
  }, [activeTenantId]);

  useEffect(() => {
    if (activeTenantId && abaAtiva === "MENSALIDADES") {
      carregarDevedores();
    }
  }, [mesRelatorio, anoRelatorio, abaAtiva]);

  async function handleSettlePayment(player: any) {
    if (!activeTenantId || settlingId) return;
    
    // Valor padrão da mensalidade base
    const amount = 50; 

    setSettlingId(player.id);
    try {
      await toast.promise(
        settleMonthlyPayment(activeTenantId, player.id, player.nome, mesRelatorio, anoRelatorio, amount),
        {
          loading: `Baixando mensalidade de ${player.nome}...`,
          success: 'Pagamento registrado!',
          error: 'Erro ao registrar baixa.'
        }
      );
      carregarDevedores();
      carregarDados(); // Atualiza contador e métricas
    } catch (e) {
      console.error(e);
    } finally {
      setSettlingId(null);
    }
  }

  async function handlePay(cobranca: Cobranca, valorPago: number) {
    if (payingId || !activeTenantId) return;
    
    setPayingId(cobranca.id!);
    try {
      await toast.promise(
        payBilling(activeTenantId, cobranca.id!, cobranca, valorPago),
        {
          loading: 'A registar pagamento...',
          success: 'Pagamento registado com sucesso!',
          error: 'Erro ao processar pagamento.',
        }
      );
      
      setSelCobranca(null);
      carregarDados();
      
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
    } finally {
      setPayingId(null);
    }
  }

  async function handleGenerate(valor: number, vencimento: string) {
    if (isGenerating || !activeTenantId) return;
    setIsGenerating(true);
    try {
      const gerados = await import("@/services/billing.service").then(m => m.generateMonthlyBillings(activeTenantId, valor, vencimento));
      if (gerados > 0) {
        toast.success(`Foram geradas ${gerados} novas mensalidades!`);
        setModalGerar(false);
        carregarDados();
      } else {
        toast.success("Nenhuma mensalidade nova precisou ser gerada.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar mensalidades.");
    } finally {
      setIsGenerating(false);
    }
  }

  const cobrancasFiltradas =
    abaAtiva === "TODOS"
      ? cobrancas
      : cobrancas.filter((c) => c.status === abaAtiva);

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-4 pt-6 md:pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="futManager Logo" width={300} height={80} className="w-auto h-10" />
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{groupName}</h1>
              <p className="mt-1 text-sm text-slate-500">Mural de Pendências</p>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <button 
            onClick={() => setModalGerar(true)} 
            disabled={isGenerating || loading} 
            className="w-full rounded-xl border-2 border-slate-200 bg-transparent py-3 text-sm font-semibold text-slate-600 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 hover:bg-slate-50 flex justify-center items-center gap-2"
          >
            🔄 Gerar Mensalidades do Mês
          </button>
        </div>
      </header>

      {loading ? (
        <section className="mt-8 px-4 flex flex-col items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-sm font-medium text-slate-500">A carregar pendências...</p>
        </section>
      ) : (
        <>
          <section className="mt-2">
            <MetricsCards metrics={metrics} loading={loadingMetrics} />
          </section>

          <section className="mt-6">
            <BarraAbas abaAtiva={abaAtiva} onChange={setAbaAtiva} />
          </section>

          <section className="mt-5 px-4 pb-24">
            {abaAtiva === "MENSALIDADES" ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Devedores de {MESES[mesRelatorio - 1]}
                  </h2>
                  <div className="flex gap-2 w-full md:w-auto">
                    <select 
                      value={mesRelatorio} 
                      onChange={(e) => setMesRelatorio(Number(e.target.value))}
                      className="flex-1 md:flex-none rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-500 shadow-sm"
                    >
                      {MESES.map((mes, idx) => (
                        <option key={mes} value={idx + 1}>{mes}</option>
                      ))}
                    </select>
                    <select 
                      value={anoRelatorio} 
                      onChange={(e) => setAnoRelatorio(Number(e.target.value))}
                      className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-emerald-500 shadow-sm"
                    >
                      {[2024, 2025, 2026].map(ano => (
                        <option key={ano} value={ano}>{ano}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingDevedores ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600 mb-2"></div>
                    <p className="text-xs text-slate-500">Buscando lista...</p>
                  </div>
                ) : devedores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-5xl">✅</span>
                    <p className="mt-4 text-lg font-bold text-slate-900">Ninguém devendo!</p>
                    <p className="mt-1 text-sm text-slate-500">Todos os mensalistas pagaram em {MESES[mesRelatorio - 1]}.</p>
                  </div>
                ) : (
                  <TabelaDevedores devedores={devedores} onSettle={handleSettlePayment} processingId={settlingId} />
                )}
              </div>
            ) : (
              <>
                {cobrancasFiltradas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-5xl">🎉</span>
                    <p className="mt-4 text-lg font-bold text-slate-900">Tudo em dia!</p>
                    <p className="mt-1 text-sm text-slate-500">Nenhuma cobrança pendente para este filtro.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cobrancasFiltradas.map((cobranca) => (
                      <CardCobranca 
                        key={cobranca.id} 
                        cobranca={cobranca} 
                        onPay={(c) => setSelCobranca(c)}
                        isPaying={payingId === cobranca.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      <ModalGerarMensalidades aberto={modalGerar} onFechar={() => setModalGerar(false)} onConfirmar={handleGenerate} isGenerating={isGenerating} />
      <ModalPagamento cobranca={selCobranca} aberto={!!selCobranca} onFechar={() => setSelCobranca(null)} onConfirmar={(v) => handlePay(selCobranca!, v)} saltando={!!payingId} />
    </div>
  );
}
