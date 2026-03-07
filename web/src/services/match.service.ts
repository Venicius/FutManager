import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, orderBy, where } from "firebase/firestore";
import { db, USERS_COLLECTION } from "../lib/firebase";

export interface Partida {
  id?: string;
  titulo: string;
  data: string;
  presentPlayers: string[]; // IDs dos jogadores presentes
}

const COLLECTION_NAME = "partidas";

/**
 * Cria uma nova partida.
 */
export async function createMatch(userId: string, titulo: string, data: string): Promise<string> {
  const matchRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const docRef = await addDoc(matchRef, {
    titulo,
    data,
    presentPlayers: []
  });
  return docRef.id;
}

/**
 * Busca todas as partidas, ordenadas por data (decrescente).
 */
export async function getMatches(userId: string): Promise<Partida[]> {
  const matchRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(matchRef, orderBy("data", "desc"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Partida, "id">)
  }));
}

/**
 * Marca ou desmarca a presença do jogador na partida.
 * @param matchId ID da partida
 * @param playerId ID do jogador
 * @param isPresent true para adicionar, false para remover
 */
export async function toggleAttendance(userId: string, matchId: string, playerId: string, isPresent: boolean): Promise<void> {
  const matchRef = doc(db, USERS_COLLECTION, userId, COLLECTION_NAME, matchId);
  await updateDoc(matchRef, {
    presentPlayers: isPresent ? arrayUnion(playerId) : arrayRemove(playerId)
  });
}

/**
 * Atualiza os dados de uma partida (título e data).
 */
export async function updateMatch(userId: string, id: string, updates: Partial<Pick<Partida, "titulo" | "data">>): Promise<void> {
  const matchRef = doc(db, USERS_COLLECTION, userId, COLLECTION_NAME, id);
  await updateDoc(matchRef, updates);
}

/**
 * Exclui uma partida.
 */
export async function deleteMatch(userId: string, id: string): Promise<void> {
  const matchRef = doc(db, USERS_COLLECTION, userId, COLLECTION_NAME, id);
  await deleteDoc(matchRef);
}
