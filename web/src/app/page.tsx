"use client";

import { useState, useEffect } from "react";
import { getPendingBillings, payBilling, type Cobranca, type StatusCobranca } from "@/services/billing.service";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────
type FiltroAba = "TODOS" | "PENDENTE" | "ATRASADO";

const ABAS: { label: string; valor: FiltroAba }[] = [
  { label: "Todos", valor: "TODOS" },
  { label: "Pendentes", valor: "PENDENTE" },
  { label: "Atrasados", valor: "ATRASADO" },
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

function ResumoCards({ cobrancas }: { cobrancas: Cobranca[] }) {
  const atrasados = cobrancas.filter((c) => c.status === "ATRASADO").length;
  const pendentes = cobrancas.filter((c) => c.status === "PENDENTE").length;
  const totalValor = cobrancas.reduce((acc, c) => acc + c.valor, 0);

  const cards = [
    { label: "Pendentes", count: pendentes, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Atrasados", count: atrasados, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "A Receber", count: formatarMoeda(totalValor), color: "text-emerald-700", bg: "bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-2xl p-4 text-center flex flex-col justify-center items-center`}>
          <p className={`text-lg md:text-2xl font-bold truncate w-full ${card.color}`}>{card.count}</p>
          <p className="mt-1 text-[10px] md:text-xs font-medium text-slate-500 uppercase">{card.label}</p>
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

// ── Página Principal ───────────────────────────────────────
export default function DashboardPendencias() {
  const [abaAtiva, setAbaAtiva] = useState<FiltroAba>("TODOS");
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalGerar, setModalGerar] = useState(false);
  const [selCobranca, setSelCobranca] = useState<Cobranca | null>(null);

  async function carregarDados() {
    setLoading(true);
    try {
      const data = await getPendingBillings();
      setCobrancas(data);
    } catch (error) {
      console.error("Erro ao carregar cobranças:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function handlePay(cobranca: Cobranca, valorPago: number) {
    if (payingId) return;
    
    setPayingId(cobranca.id!);
    try {
      await toast.promise(
        payBilling(cobranca.id!, cobranca, valorPago),
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
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const gerados = await import("@/services/billing.service").then(m => m.generateMonthlyBillings(valor, vencimento));
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">⚽ Pelada FC</h1>
            <p className="mt-0.5 text-sm text-slate-500">Mural de Pendências</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">🔔</div>
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
            <ResumoCards cobrancas={cobrancas} />
          </section>

          <section className="mt-6">
            <BarraAbas abaAtiva={abaAtiva} onChange={setAbaAtiva} />
          </section>

          <section className="mt-5 px-4 pb-24">
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
          </section>
        </>
      )}

      <ModalGerarMensalidades aberto={modalGerar} onFechar={() => setModalGerar(false)} onConfirmar={handleGenerate} isGenerating={isGenerating} />
      <ModalPagamento cobranca={selCobranca} aberto={!!selCobranca} onFechar={() => setSelCobranca(null)} onConfirmar={(v) => handlePay(selCobranca!, v)} saltando={!!payingId} />
    </div>
  );
}
