import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db, TENANT_ACCESS_COLLECTION } from "../lib/firebase";

export type AdminRole = "admin" | "editor";

export interface Admin {
  id?: string;
  email: string;
  ownerUid: string;
  role: AdminRole;
  createdAt: string;
}

const COLLECTION_NAME = TENANT_ACCESS_COLLECTION;

/**
 * Busca todos os administradores e editores ordenados por data de criação.
 * 
 * @param userId ID do usuário proprietário dos dados
 * @returns Array de Admins com ID preenchido
 */
export async function getAdmins(userId: string): Promise<Admin[]> {
  const adminsRef = collection(db, COLLECTION_NAME);
  const q = query(
    adminsRef, 
    where("ownerUid", "==", userId),
    orderBy("createdAt", "asc")
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Admin, "id">)
  }));
}

/**
 * Adiciona um novo administrador/editor na coleção `config_admins` no Firestore.
 * Bloqueia cadastro duplicado de e-mail.
 * 
 * @param userId ID do usuário proprietário dos dados
 * @param email E-mail do usuário autorizado
 * @param role Perfil de acesso (admin ou editor)
 * @returns O ID gerado do documento criado
 */
export async function addAdmin(userId: string, email: string, role: AdminRole): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const adminsRef = collection(db, COLLECTION_NAME);

  // 1. Verificar duplicidade de e-mail no mesmo tenant
  const q = query(
    adminsRef,
    where("email", "==", normalizedEmail),
    where("ownerUid", "==", userId)
  );
  
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("Este e-mail já possui acesso configurado.");
  }

  // 2. Inserir no Firestore
  const dataToSave: Omit<Admin, "id"> = { 
    email: normalizedEmail, 
    ownerUid: userId,
    role,
    createdAt: new Date().toISOString()
  };
  
  const docRef = await addDoc(adminsRef, dataToSave);
  return docRef.id;
}

/**
 * Remove o acesso de um administrador/editor existente.
 * 
 * @param docId ID do documento na coleção tenant_access
 */
export async function removeAdmin(docId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, docId);
  await deleteDoc(docRef);
}
