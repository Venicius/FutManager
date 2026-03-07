"use client";

import { useState, useEffect, useRef } from "react";
import { getTransactions, addTransaction, type Transaction, type TipoTransacao } from "@/services/transaction.service";
import { calculateTotalBalance } from "@/services/financial.service";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type CategoriaTransacao = "Mensalidade" | "Avulso" | "Arbitragem" | "Aluguel" | "Bolas" | "Água" | "Confraternização" | "Outros";

const CATEGORIAS_DESPESA: CategoriaTransacao[] = ["Arbitragem", "Aluguel", "Bolas", "Água", "Confraternização", "Outros"];

// ── Helpers ────────────────────────────────────────────────
function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtD(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
function fmtDH(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function ico(c: string) {
  const map: Record<string, string> = { Mensalidade: "💳", Avulso: "🎟️", Arbitragem: "🏁", Aluguel: "🏟️", Bolas: "⚽", Água: "💧", Confraternização: "🎉", Outros: "📦" };
  return map[c] || "💰";
}

// ── Componentes ────────────────────────────────────────────

function CardSaldo({ saldo, entradas, saidas }: { saldo: number; entradas: number; saidas: number }) {
  return (
    <div className="mx-4 rounded-3xl bg-emerald-600 p-6 shadow-lg shadow-emerald-200 print:shadow-none print:rounded-xl print:border print:border-emerald-200">
      <p className="text-sm font-medium text-emerald-100 print:text-emerald-800">Saldo Atual</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-white print:text-emerald-900">{fmt(saldo)}</p>
      <div className="mt-5 flex gap-3">
        <div className="flex-1 rounded-2xl bg-white/20 px-4 py-3 print:bg-emerald-50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100 print:text-emerald-700">Entradas</p>
          <p className="mt-0.5 text-base font-bold text-white print:text-emerald-800">+{fmt(entradas)}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-rose-500/80 px-4 py-3 shadow-inner print:bg-rose-50 print:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-100 print:text-rose-700">Saídas</p>
          <p className="mt-0.5 text-base font-bold text-white print:text-rose-800">-{fmt(saidas)}</p>
        </div>
      </div>
    </div>
  );
}

function LinhaTransacao({ t }: { t: Transaction }) {
  const e = t.type === "ENTRADA";
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:scale-[0.98]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{ico(t.category)}</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{t.description}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          <span className="md:hidden">{fmtD(t.date)}</span>
          <span className="hidden md:inline">{fmtDH(t.date)}</span>
          <span className="mx-1">·</span>{t.category}
        </p>
      </div>
      <p className={`text-sm font-bold whitespace-nowrap ${e ? "text-emerald-700" : "text-rose-600"}`}>
        {e ? "+" : "−"}{fmt(t.amount)}
      </p>
    </div>
  );
}

function ModalNovoLancamento({ aberto, onFechar, onSalvo }: { aberto: boolean; onFechar: () => void; onSalvo: () => void }) {
  const [tipo, setTipo] = useState<TipoTransacao>("SAIDA");
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [cat, setCat] = useState<CategoriaTransacao>("Arbitragem");
  const [dt, setDt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [salvando, setSalvando] = useState(false);
  const { activeTenantId } = useAuth();

  if (!aberto) return null;

  async function sub(e: React.FormEvent) {
    e.preventDefault();
    if (salvando || !activeTenantId) return;
    
    setSalvando(true);
    try {
      await addTransaction(activeTenantId, {
        description: desc.trim(),
        amount: parseFloat(val.replace(",", ".")),
        category: cat,
        type: tipo,
        date: new Date(dt).toISOString()
      });
      
      toast.success("Lançamento salvo com sucesso!");
      onSalvo();
      onFechar();
      setDesc(""); setVal(""); setCat("Arbitragem"); setTipo("SAIDA");
      const rec = new Date(); rec.setMinutes(rec.getMinutes() - rec.getTimezoneOffset());
      setDt(rec.toISOString().slice(0, 16));
    } catch (error: any) {
      console.error("Erro ao salvar lançamento:", error);
      toast.error(error.message || "Erro ao salvar lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  const isEntrada = tipo === "ENTRADA";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl md:rounded-3xl bg-white px-5 pb-10 pt-6 md:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">Novo Lançamento</h2>
        
        <form onSubmit={sub} className="flex flex-col gap-5">
          {/* Toggle de Tipo */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTipo("ENTRADA")}
              disabled={salvando}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                isEntrada ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              + Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo("SAIDA")}
              disabled={salvando}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                !isEntrada ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              − Saída
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Descrição</label>
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Pagamento Juiz" disabled={salvando} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
              <input type="number" inputMode="decimal" min="0.01" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0,00" disabled={salvando} className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3.5 text-base font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Categoria</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {CATEGORIAS_DESPESA.map((c) => {
                const isSelected = cat === c;
                return (
                  <button key={c} type="button" onClick={() => setCat(c)} disabled={salvando} 
                    className={`flex flex-col items-center gap-1 rounded-xl py-3 px-1 text-[11px] font-semibold active:scale-95 disabled:scale-100 disabled:opacity-50 text-center leading-tight transition-all ${
                      isSelected 
                        ? (isEntrada ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-rose-600 text-white shadow-md shadow-rose-200") 
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}>
                    <span className="text-lg mb-0.5">{ico(c)}</span>{c}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-500">Data e Hora</label>
            <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} disabled={salvando} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50" required />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onFechar} disabled={salvando} className="flex-1 rounded-xl border border-slate-200 py-4 text-sm font-semibold text-slate-500 active:scale-95 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={salvando} className={`flex-1 rounded-xl py-4 text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-70 transition-all ${isEntrada ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700" : "bg-rose-600 shadow-rose-200 hover:bg-rose-700"}`}>
              {salvando ? "A salvar..." : `Salvar ${isEntrada ? "Entrada" : "Saída"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página Caixa ───────────────────────────────────────────
export default function CaixaPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMenuAberto, setExportMenuAberto] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { activeTenantId, groupName } = useAuth();

  async function carregar() {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const data = await getTransactions(activeTenantId);
      setTransacoes(data);
    } catch (error) {
      console.error("Erro ao carregar transações", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTenantId) carregar();
  }, [activeTenantId]);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Usa o financial.service puro para a matemática
  const saldo = calculateTotalBalance(transacoes);
  const ent = transacoes.filter((t) => t.type === "ENTRADA").reduce((a, t) => a + t.amount, 0);
  const sai = transacoes.filter((t) => t.type === "SAIDA").reduce((a, t) => a + t.amount, 0);

  function exportToCSV() {
    const sep = ";";
    const headers = ["Data", "Descrição", "Tipo", "Valor"].join(sep);
    const rows = transacoes.map((t) => {
      const data = new Date(t.date).toLocaleDateString("pt-BR");
      const descricao = `"${t.description.replace(/"/g, '""')}"`;
      const tipo = t.type === "ENTRADA" ? "Entrada" : "Saída";
      const valor = t.amount.toFixed(2).replace(".", ",");
      return [data, descricao, tipo, valor].join(sep);
    });
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio_caixa.csv";
    link.click();
    URL.revokeObjectURL(url);
    setExportMenuAberto(false);
    toast.success("Download do relatório iniciado!");
  }

  function handlePrint() {
    setExportMenuAberto(false);
    setTimeout(() => window.print(), 100);
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-4 pt-6 md:pt-2 flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">💰 Caixa</h1>
          <p className="mt-0.5 text-sm text-slate-500">Fluxo de caixa de: {groupName}</p>
        </div>

        {/* Dropdown Exportar */}
        <div className="relative mt-1" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuAberto((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <span>📤</span> Exportar
            <svg className={`h-3.5 w-3.5 transition-transform ${exportMenuAberto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" /></svg>
          </button>

          {exportMenuAberto && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-lg shadow-slate-200/60">
              <button
                onClick={exportToCSV}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="text-base">📊</span>
                <div className="text-left">
                  <p className="font-semibold">Baixar Excel (CSV)</p>
                  <p className="text-[11px] text-slate-400">relatorio_caixa.csv</p>
                </div>
              </button>
              <div className="mx-3 my-1 h-px bg-slate-100" />
              <button
                onClick={handlePrint}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="text-base">🖨️</span>
                <div className="text-left">
                  <p className="font-semibold">Imprimir Relatório</p>
                  <p className="text-[11px] text-slate-400">Gera um PDF de extrato</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Cabeçalho de impressão — visível apenas no print */}
      <div className="hidden print:block px-4 pb-4 pt-6">
        <h1 className="text-2xl font-bold tracking-tight text-black">Relatório de Caixa</h1>
        <p className="mt-0.5 text-sm text-slate-600">Extrato gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      {loading ? (
        <section className="mt-2 px-4 flex flex-col items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-sm font-medium text-slate-500">A processar o livro caixa...</p>
        </section>
      ) : (
        <>
          <section className="mt-2"><CardSaldo saldo={saldo} entradas={ent} saidas={sai} /></section>
          
          {/* Botão flutuante para melhorar UX mobile (além do botão inline) */}
          <button onClick={() => setModalAberto(true)}
            className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-200 transition-all active:scale-90 hover:bg-emerald-700">
            +
          </button>

          <section className="mt-5 px-4">
            <button onClick={() => setModalAberto(true)} className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white py-4 text-sm font-bold text-slate-500 active:scale-[0.98] hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center gap-2">
              <span className="text-lg">+</span> Novo Lançamento
            </button>
          </section>
          
          <section className="mt-6 px-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600 print:text-sm">Extrato de Transações</h2>
            {transacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-4xl">🍃</span>
                <p className="mt-4 text-sm font-semibold text-slate-900">Caixa vazio</p>
                <p className="mt-1 text-xs text-slate-500 max-w-[200px]">Nenhuma transação foi registada ainda.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {transacoes.map((t) => <LinhaTransacao key={t.id} t={t} />)}
              </div>
            )}
          </section>
        </>
      )}

      <div className="print:hidden"><ModalNovoLancamento aberto={modalAberto} onFechar={() => setModalAberto(false)} onSalvo={carregar} /></div>
    </div>
  );
}
