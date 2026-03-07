import { collection, doc, updateDoc, getDocs, query, where, orderBy, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { addTransaction } from "./transaction.service";
import { getPlayers } from "./player.service";

export type StatusCobranca = "PAGO" | "PENDENTE" | "ATRASADO";
export type TipoVinculo = "Mensalista" | "Diarista" | "Convidado";

export interface Cobranca {
  id?: string;
  jogadorId: string;
  nomeJogador: string;
  vinculo: TipoVinculo;
  status: StatusCobranca;
  valor: number;
  referencia: string;
  dueDate?: string;
}

const COLLECTION_NAME = "cobrancas";

/**
 * Busca todas as cobranças que ainda não foram pagas (Pendente ou Atrasado).
 */
export async function getPendingBillings(userId: string): Promise<Cobranca[]> {
  const billsRef = collection(db, "users", userId, COLLECTION_NAME);
  const q = query(
    billsRef,
    where("status", "in", ["PENDENTE", "ATRASADO"])
  );
  
  const querySnapshot = await getDocs(q);
  // Como o Firestore no plano gratuito pode limitar multi-campos em queries `in`, 
  // trazemos e garantimos a ordenação no cliente pelo nome caso não tenha index composto pronto.
  const cobrancas = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Cobranca, "id">)
  }));

  return cobrancas.sort((a, b) => a.nomeJogador.localeCompare(b.nomeJogador));
}

/**
 * Registra o pagamento de uma cobrança:
 * 1. Calcula a diferença entre valor pago e valor da cobrança.
 * 2. Atualiza status para PAGO ou reduz o valor pendente.
 * 3. Lança crédito se pago a maior.
 * 4. Lança transação financeira.
 */
export async function payBilling(userId: string, billingId: string, cobranca: Cobranca, valorPago: number): Promise<void> {
  try {
    const diferenca = valorPago - cobranca.valor;
    const docRef = doc(db, "users", userId, COLLECTION_NAME, billingId);

    if (diferenca >= 0) {
      // Pagamento total ou a maior
      await updateDoc(docRef, { status: 'PAGO' });

      if (diferenca > 0) {
        // Lançar crédito para o jogador
        const jogadores = await getPlayers(userId);
        const jogador = jogadores.find(j => j.id === cobranca.jogadorId);
        if (jogador) {
          const jogadorRef = doc(db, "users", userId, "jogadores", jogador.id!);
          await updateDoc(jogadorRef, {
            creditoAcumulado: (jogador.creditoAcumulado || 0) + diferenca
          });
        }
      }
    } else {
      // Pagamento parcial
      await updateDoc(docRef, {
        valor: cobranca.valor - valorPago
      });
    }

    // 2. Registrar no Caixa (Transação Automática com valor REAL pago)
    await addTransaction(userId, {
      description: 'Pagamento: ' + cobranca.nomeJogador + ' (' + cobranca.referencia + ')',
      amount: Number(valorPago),
      category: cobranca.vinculo === "Mensalista" ? "Mensalidade" : "Avulso",
      type: 'ENTRADA',
      date: new Date().toISOString(),
      playerId: cobranca.jogadorId
    });
  } catch (error) {
    console.error("Erro em payBilling:", error);
    throw error;
  }
}

/**
 * Gera as cobranças do mês para todos os jogadores Mensalistas ativos.
 * Aplica abatimento automático de créditos acumulados.
 */
export async function generateMonthlyBillings(userId: string, amount: number, dueDate: string): Promise<number> {
  const jogadores = await getPlayers(userId);
  const mensalistasAtivos = jogadores.filter(j => j.vinculo === "Mensalista" && j.status === "Ativo");

  const now = new Date();
  const mesAtual = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  let gerados = 0;

  for (const jogador of mensalistasAtivos) {
    if (!jogador.id) continue;

    const billsRef = collection(db, "users", userId, COLLECTION_NAME);
    const q = query(
      billsRef,
      where("jogadorId", "==", jogador.id),
      where("referencia", "==", mesAtual)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      const credito = jogador.creditoAcumulado || 0;
      let status: StatusCobranca = "PENDENTE";
      let valorFinal = amount;
      let novoCredito = credito;

      if (credito >= amount) {
        status = "PAGO";
        valorFinal = amount;
        novoCredito = credito - amount;
      } else if (credito > 0) {
        status = "PENDENTE";
        valorFinal = amount - credito;
        novoCredito = 0;
      }

      await addDoc(billsRef, {
        jogadorId: jogador.id,
        nomeJogador: jogador.nome,
        vinculo: "Mensalista",
        status,
        valor: valorFinal,
        referencia: mesAtual,
        dueDate
      });

      if (novoCredito !== credito) {
        const jogadorRef = doc(db, "users", userId, "jogadores", jogador.id);
        await updateDoc(jogadorRef, { creditoAcumulado: novoCredito });
      }

      // Se foi pago via crédito, registrar entrada no caixa fictícia (ou opcional)
      // O usuário não pediu explicitamente addTransaction pro crédito mas é uma boa prática
      // Porém vamos seguir estritamente o pedido.

      gerados++;
    }
  }

  return gerados;
}

/**
 * Gera as cobranças para os diaristas presentes em uma partida específica.
 */
export async function generateMatchBillings(
  userId: string,
  matchId: string, 
  matchTitle: string, 
  presentPlayerIds: string[], 
  allPlayers: any[], 
  amount: number, 
  dueDate: string
): Promise<number> {
  const diaristasPresentes = allPlayers.filter(
    (p) => presentPlayerIds.includes(p.id) && p.vinculo === "Diarista"
  );
  
  let gerados = 0;
  
  for (const jogador of diaristasPresentes) {
    if (!jogador.id) continue;
    
    const billsRef = collection(db, "users", userId, COLLECTION_NAME);
    const q = query(
      billsRef,
      where("jogadorId", "==", jogador.id),
      where("referencia", "==", `Partida: ${matchTitle} - ${matchId}`)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(billsRef, {
        jogadorId: jogador.id,
        nomeJogador: jogador.nome,
        vinculo: "Diarista",
        status: "PENDENTE",
        valor: amount,
        referencia: `Partida: ${matchTitle} - ${matchId}`,
        dueDate: dueDate
      });
      gerados++;
    }
  }
  
  return gerados;
}

/**
 * Busca todas as cobranças de um jogador específico, ordenadas por data de vencimento (desc).
 */
export async function getPlayerBillings(activeTenantId: string, playerId: string): Promise<Cobranca[]> {
  const billsRef = collection(db, "users", activeTenantId, COLLECTION_NAME);
  const q = query(
    billsRef,
    where("jogadorId", "==", playerId),
    orderBy("dueDate", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Cobranca, "id">)
  }));
}

/**
 * Permite lançar dívidas ou pagamentos do passado manualmente.
 */
export async function addRetroactiveBilling(
  activeTenantId: string, 
  data: Omit<Cobranca, "id" | "vinculo"> & { vinculo?: TipoVinculo }
): Promise<void> {
  const billsRef = collection(db, "users", activeTenantId, COLLECTION_NAME);
  
  // Se vinculo não for passado, podemos assumir Mensalista ou buscar do jogador.
  // Para simplificar a migração, o chamador deve passar ou assumimos Mensalista.
  await addDoc(billsRef, {
    ...data,
    vinculo: data.vinculo || "Mensalista"
  });
}
