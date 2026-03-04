import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface UserProfile {
  nome?: string;
  telefone?: string;
}

const COLLECTION_NAME = "users";

/**
 * Busca o perfil adicional do usuário logado (nome, telefone).
 * 
 * @param userId ID do usuário (Firebase Auth UID)
 * @returns Os dados do perfil ou null se não houver documento
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

/**
 * Atualiza (ou cria, se não existir) o perfil adicional do usuário usando merge: true.
 * 
 * @param userId ID do usuário (Firebase Auth UID)
 * @param data Dados parciais (nome, telefone, etc.)
 */
export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  await setDoc(docRef, data, { merge: true });
}
