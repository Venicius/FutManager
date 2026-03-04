import { collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";

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
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const transRef = collection(db, "users", userId, COLLECTION_NAME);
  const q = query(transRef, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Transaction, "id">)
  }));
}

/**
 * Adiciona uma nova transação financeira.
 */
export async function addTransaction(userId: string, transactionData: Omit<Transaction, "id">): Promise<string> {
  const transRef = collection(db, "users", userId, COLLECTION_NAME);
  const docRef = await addDoc(transRef, transactionData);
  return docRef.id;
}
