import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type TipoVinculo = "Mensalista" | "Diarista";
export type StatusJogador = "Ativo" | "Inativo";

export interface Jogador {
  id?: string;
  nome: string;
  whatsapp: string;
  vinculo: TipoVinculo;
  status: StatusJogador;
  creditoAcumulado?: number;
}

const COLLECTION_NAME = "jogadores";

// ── Helpers ────────────────────────────────────────────────
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Adiciona um novo jogador na coleção "jogadores" no Firestore.
 * Bloqueia cadastro duplicado baseado no WhatsApp.
 * 
 * @param playerData Dados basícos do jogador
 * @returns O ID gerado do documento criado
 */
export async function addPlayer(playerData: Omit<Jogador, "id">): Promise<string> {
  const sanitizedPhone = sanitizePhone(playerData.whatsapp);
  
  // 1. Verificar duplicidade
  const q = query(
    collection(db, COLLECTION_NAME),
    where("whatsapp", "==", sanitizedPhone)
  );
  
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("Já existe um jogador cadastrado com este número de WhatsApp.");
  }

  // 2. Inserir no Firestore
  const dataToSave = { ...playerData, whatsapp: sanitizedPhone, creditoAcumulado: 0 };
  const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
  return docRef.id;
}

/**
 * Busca todos os jogadores na coleção ordenados alfabeticamente.
 * 
 * @returns Array de jogadores com ID preenchido
 */
export async function getPlayers(): Promise<Jogador[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("nome", "asc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Jogador, "id">)
  }));
}

/**
 * Atualiza os dados de um jogador existente.
 * Valida a duplicidade de WhatsApp ignorando o próprio jogador.
 * 
 * @param id ID do jogador a ser editado
 * @param playerData Novos dados do jogador
 */
export async function updatePlayer(id: string, playerData: Partial<Omit<Jogador, "id">>): Promise<void> {
  const updates: any = { ...playerData };
  
  if (playerData.whatsapp) {
    const sanitizedPhone = sanitizePhone(playerData.whatsapp);
    updates.whatsapp = sanitizedPhone;
    
    // Verificar duplicidade (somente se não for o próprio jogador)
    const q = query(
      collection(db, COLLECTION_NAME),
      where("whatsapp", "==", sanitizedPhone)
    );
    
    const querySnapshot = await getDocs(q);
    const isDuplicate = querySnapshot.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      throw new Error("Já existe outro jogador cadastrado com este número de WhatsApp.");
    }
  }

  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, updates);
}
