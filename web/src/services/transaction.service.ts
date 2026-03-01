import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TipoTransacao = "ENTRADA" | "SAIDA";

export interface Transaction {
  id?: string;
  description: string;
  type: TipoTransacao;
  category: string;
  amount: number;
  date: string;
}

const COLLECTION_NAME = "transacoes";

/**
 * Busca todas as transações, ordenadas da mais recente para a mais antiga.
 */
export async function getTransactions(): Promise<Transaction[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Transaction, "id">)
  }));
}

/**
 * Adiciona uma nova transação financeira.
 */
export async function addTransaction(transactionData: Omit<Transaction, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), transactionData);
  return docRef.id;
}
