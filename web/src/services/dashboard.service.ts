import { collection, getDocs, query, where } from "firebase/firestore";
import { db, USERS_COLLECTION } from "../lib/firebase";
import { getTransactions } from "./transaction.service";

export interface DashboardMetrics {
  monthlyIncome: number;
  monthlyExpense: number;
  totalPending: number;
}

/**
 * Calcula as métricas financeiras reais do mês e o total a receber.
 */
export async function getDashboardMetrics(activeTenantId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const primeiroDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Buscar transações e cobranças pendentes
  const billsRef = collection(db, USERS_COLLECTION, activeTenantId, "mensalidades");
  
  const [transactions, billsSnap] = await Promise.all([
    getTransactions(activeTenantId),
    getDocs(query(
      billsRef, 
      where("status", "in", ["pendente", "atrasado"])
    ))
  ]);

  // 2. Fluxo do Mês (Entradas e Saídas)
  const monthlyTransactions = transactions.filter(t => t.date >= primeiroDiaMes);
  
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === "ENTRADA")
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === "SAIDA")
    .reduce((acc, t) => acc + t.amount, 0);

  // 3. Total a Receber (Soma de toda a inadimplência/pendências do sistema)
  const totalPending = billsSnap.docs.reduce((acc, d) => acc + (d.data().valor || 0), 0);

  return {
    monthlyIncome,
    monthlyExpense,
    totalPending
  };
}
