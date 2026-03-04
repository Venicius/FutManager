import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export type TipoVinculo = "Mensalista" | "Diarista" | "Espera";
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
 * @param userId ID do usuário proprietário dos dados
 * @param playerData Dados basícos do jogador
 * @returns O ID gerado do documento criado
 */
export async function addPlayer(userId: string, playerData: Omit<Jogador, "id">): Promise<string> {
  const sanitizedPhone = sanitizePhone(playerData.whatsapp);
  const playersRef = collection(db, "users", userId, COLLECTION_NAME);
  
  // 1. Verificar duplicidade
  const q = query(
    playersRef,
    where("whatsapp", "==", sanitizedPhone)
  );
  
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("Já existe um jogador cadastrado com este número de WhatsApp.");
  }

  // 2. Inserir no Firestore
  const dataToSave = { ...playerData, whatsapp: sanitizedPhone, creditoAcumulado: 0 };
  const docRef = await addDoc(playersRef, dataToSave);
  return docRef.id;
}

/**
 * Busca jogadores na coleção ordenados alfabeticamente.
 * 
 * @param userId ID do proprietário
 * @param vincFilter Se informado, filtra pelo campo `vinculo` (ex: 'Espera')
 * @returns Array de jogadores com ID preenchido
 */
export async function getPlayers(userId: string, vincFilter?: string): Promise<Jogador[]> {
  const playersRef = collection(db, "users", userId, COLLECTION_NAME);
  const constraints = vincFilter
    ? [where("vinculo", "==", vincFilter), orderBy("nome", "asc")]
    : [orderBy("nome", "asc")];
  const q = query(playersRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<Jogador, "id">)
  }));
}

/**
 * Promove um jogador da Lista de Espera para Mensalista.
 *
 * @param id ID do documento do jogador no Firestore
 */
export async function promotePlayerToMonthly(userId: string, id: string): Promise<void> {
  const docRef = doc(db, "users", userId, COLLECTION_NAME, id);
  await updateDoc(docRef, { vinculo: "Mensalista" });
}

/**
 * Atualiza os dados de um jogador existente.
 * Valida a duplicidade de WhatsApp ignorando o próprio jogador.
 * 
 * @param userId ID do proprietário (para validação segura do WhatsApp)
 * @param id ID do jogador a ser editado
 * @param playerData Novos dados do jogador
 */
export async function updatePlayer(userId: string, id: string, playerData: Partial<Omit<Jogador, "id">>): Promise<void> {
  const updates: any = { ...playerData };
  const playersRef = collection(db, "users", userId, COLLECTION_NAME);
  
  if (playerData.whatsapp) {
    const sanitizedPhone = sanitizePhone(playerData.whatsapp);
    updates.whatsapp = sanitizedPhone;
    
    // Verificar duplicidade (somente se não for o próprio jogador)
    const q = query(
      playersRef,
      where("whatsapp", "==", sanitizedPhone)
    );
    
    const querySnapshot = await getDocs(q);
    const isDuplicate = querySnapshot.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      throw new Error("Já existe outro jogador cadastrado com este número de WhatsApp.");
    }
  }

  const docRef = doc(db, "users", userId, COLLECTION_NAME, id);
  await updateDoc(docRef, updates);
}
