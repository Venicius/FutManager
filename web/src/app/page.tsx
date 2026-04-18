"use client";

import { useState, useEffect } from "react";
import { getPendingPayments, getPaidPayments, settleMonthlyPayment, gerarMensalidadesParaGrupo } from "@/services/billing.service";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboard.service";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle, Calendar } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────
type FiltroAba = "PENDENTES" | "PAGOS";

const ABAS: { label: string; valor: FiltroAba }[] = [
  { label: "Pendentes", valor: "PENDENTES" },
  { label: "Pagos ✓", valor: "PAGOS" },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];



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

function BarraAbas({ abaAtiva, onChange, countPendentes, countPagos }: { abaAtiva: FiltroAba; onChange: (aba: FiltroAba) => void; countPendentes: number; countPagos: number }) {
  const counts: Record<FiltroAba, number> = { PENDENTES: countPendentes, PAGOS: countPagos };
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
            {counts[aba.valor] > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                ativo ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {counts[aba.valor]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TabelaPagos({ pagos }: { pagos: any[] }) {
  return (
    <div className="flex flex-col gap-3">
      {pagos.map((player) => {
        const dataPag = player.dataPagamento ? new Date(player.dataPagamento) : null;
        return (
          <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border-l-4 border-l-emerald-500 border border-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 uppercase">
                {player.nome.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{player.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700">
                    ✓ Pago
                  </span>
                  {dataPag && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      em {dataPag.toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm font-bold text-emerald-700">{formatarMoeda(player.valor)}</p>
          </div>
        );
      })}
    </div>
  );
}

function ModalGerarMensalidades({ aberto, onFechar, onConfirmar, isGenerating }: { aberto: boolean; onFechar: () => void; onConfirmar: (valor: number, vencimento: string, periodo: string) => void; isGenerating: boolean }) {
  const [valor, setValor] = useState(50);
  const [vencimento, setVencimento] = useState("");
  const [periodo, setPeriodo] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

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
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase">Período (Mês/Ano)</label>
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase">Data de Vencimento</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <button 
            disabled={!vencimento || !periodo || isGenerating}
            onClick={() => onConfirmar(valor, vencimento, periodo)}
            className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? "Processando Lote..." : "Lançar Mensalidades"}
          </button>
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
        const isAtrasado = player.calculatedStatus === "atrasado";
        // player.dataVencimento vem como string ISO para o UI
        const dataVenc = new Date(player.dataVencimento);
        
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
                     Vence: {dataVenc.toLocaleDateString('pt-BR')}
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
  const [abaAtiva, setAbaAtiva] = useState<FiltroAba>("PENDENTES");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalGerar, setModalGerar] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Mensalidades Reconciliation
  const [devedores, setDevedores] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [mesRelatorio, setMesRelatorio] = useState(new Date().getMonth() + 1);
  const [anoRelatorio, setAnoRelatorio] = useState(new Date().getFullYear());
  const [loadingDevedores, setLoadingDevedores] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const { activeTenantId, groupName } = useAuth();

  async function carregarDados() {
    if (!activeTenantId) return;
    setLoading(true);
    setLoadingMetrics(true);
    try {
      const metricsData = await getDashboardMetrics(activeTenantId);
      setMetrics(metricsData);
      
      // Carregar listas do mês
      carregarDevedores();
      carregarPagos();
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

  async function carregarPagos() {
    if (!activeTenantId) return;
    setLoadingPagos(true);
    try {
      const data = await getPaidPayments(activeTenantId, mesRelatorio, anoRelatorio);
      setPagos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPagos(false);
    }
  }

  useEffect(() => {
    if (activeTenantId) carregarDados();
  }, [activeTenantId]);

  useEffect(() => {
    if (activeTenantId) {
      carregarDevedores();
      carregarPagos();
    }
  }, [mesRelatorio, anoRelatorio]);

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

  async function handleGenerate(valor: number, vencimento: string, periodo: string) {
    if (isGenerating || !activeTenantId) return;
    setIsGenerating(true);
    try {
      const vDate = new Date(vencimento + "T12:00:00"); // Garante meio-dia para evitar timezone shift no Date
      const gerados = await gerarMensalidadesParaGrupo(activeTenantId, periodo, vDate, valor);
      
      if (gerados > 0) {
        toast.success(`Sucesso! ${gerados} mensalidades lançadas.`);
        setModalGerar(false);
        carregarDados();
      } else {
        toast.success("Nenhuma mensalidade nova gerada (possível duplicidade).");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro no motor de faturamento.");
    } finally {
      setIsGenerating(false);
    }
  }

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
            <BarraAbas abaAtiva={abaAtiva} onChange={setAbaAtiva} countPendentes={devedores.length} countPagos={pagos.length} />
          </section>

          <section className="mt-5 px-4 pb-24">
            {/* Seletor de Mês/Ano — compartilhado pelas duas abas */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {MESES[mesRelatorio - 1]} / {anoRelatorio}
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

            {abaAtiva === "PENDENTES" ? (
              <div className="space-y-4">
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
              <div className="space-y-4">
                {loadingPagos ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600 mb-2"></div>
                    <p className="text-xs text-slate-500">Buscando pagos...</p>
                  </div>
                ) : pagos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-5xl">💤</span>
                    <p className="mt-4 text-lg font-bold text-slate-900">Nenhum pagamento registrado</p>
                    <p className="mt-1 text-sm text-slate-500">Nenhum mensalista pagou em {MESES[mesRelatorio - 1]} ainda.</p>
                  </div>
                ) : (
                  <TabelaPagos pagos={pagos} />
                )}
              </div>
            )}
          </section>
        </>
      )}

      <ModalGerarMensalidades aberto={modalGerar} onFechar={() => setModalGerar(false)} onConfirmar={handleGenerate} isGenerating={isGenerating} />
    </div>
  );
}
