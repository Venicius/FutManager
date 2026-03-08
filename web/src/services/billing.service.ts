import { collection, doc, updateDoc, getDocs, query, where, orderBy, addDoc } from "firebase/firestore";
import { db, USERS_COLLECTION } from "../lib/firebase";
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
  dueDate?: any; // Firestore Timestamp, Date ou string ISO
}

/**
 * Helper para converter qualquer formato de data para Date e zerar as horas.
 */
export function normalizeDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  let d: Date;
  
  if (typeof dateVal === "string") {
    // Trata YYYY-MM-DD ou ISO
    if (dateVal.includes("-") && !dateVal.includes("T")) {
      const [y, m, day] = dateVal.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateVal);
    }
  } else if (dateVal.toDate) {
    // Firestore Timestamp
    d = dateVal.toDate();
  } else {
    d = new Date(dateVal);
  }

  d.setHours(0, 0, 0, 0);
  return d;
}

const COLLECTION_NAME = "cobrancas";

/**
 * Busca todas as cobranças que ainda não foram pagas (Pendente ou Atrasado).
 */
export async function getPendingBillings(userId: string): Promise<Cobranca[]> {
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(
    billsRef,
    where("status", "in", ["PENDENTE", "ATRASADO"])
  );
  
  const querySnapshot = await getDocs(q);
  const hoje = normalizeDate(new Date()).getTime();

  const cobrancas = querySnapshot.docs.map(doc => {
    const data = doc.data() as Omit<Cobranca, "id">;
    let status = data.status;

    // Lógica automática: Se está pendente mas venceu, visualmente é ATRASADO
    if (status === "PENDENTE" && data.dueDate) {
      const venc = normalizeDate(data.dueDate).getTime();
      if (hoje > venc) status = "ATRASADO";
    }

    return {
      id: doc.id,
      ...data,
      status
    };
  });

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
    const docRef = doc(db, USERS_COLLECTION, userId, COLLECTION_NAME, billingId);

    if (diferenca >= 0) {
      // Pagamento total ou a maior
      await updateDoc(docRef, { status: 'PAGO' });

      if (diferenca > 0) {
        // Lançar crédito para o jogador
        const jogadores = await getPlayers(userId);
        const jogador = jogadores.find(j => j.id === cobranca.jogadorId);
        if (jogador) {
          const jogadorRef = doc(db, USERS_COLLECTION, userId, "jogadores", jogador.id!);
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

    const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
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
        dueDate: normalizeDate(dueDate) // Salva como Date (Firestore salvará como Timestamp)
      });

      if (novoCredito !== credito) {
        const jogadorRef = doc(db, USERS_COLLECTION, userId, "jogadores", jogador.id);
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
    
    const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
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
        dueDate: normalizeDate(dueDate)
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
  const billsRef = collection(db, USERS_COLLECTION, activeTenantId, COLLECTION_NAME);
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
  const billsRef = collection(db, USERS_COLLECTION, activeTenantId, COLLECTION_NAME);
  
  // Se vinculo não for passado, podemos assumir Mensalista ou buscar do jogador.
  // Para simplificar a migração, o chamador deve passar ou assumimos Mensalista.
  await addDoc(billsRef, {
    ...data,
    vinculo: data.vinculo || "Mensalista"
  });
}
/**
 * Busca jogadores mensalistas ativos que não possuem pagamento confirmado no mês/ano.
 */
export async function getPendingPayments(userId: string, month: number, year: number): Promise<any[]> {
  const players = await getPlayers(userId);
  const activeMonthly = players.filter(p => p.status === "Ativo" && p.vinculo === "Mensalista");

  const referencia = `${String(month).padStart(2, '0')}/${year}`;
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(billsRef, where("referencia", "==", referencia));
  const snap = await getDocs(q);

  const billsByPlayer: Record<string, Cobranca> = {};
  snap.docs.forEach(d => {
    const data = d.data() as Cobranca;
    billsByPlayer[data.jogadorId] = data;
  });

  const hojeTime = normalizeDate(new Date()).getTime();

  return activeMonthly
    .filter(p => !billsByPlayer[p.id!] || billsByPlayer[p.id!].status !== "PAGO")
    .map(p => {
      const bill = billsByPlayer[p.id!];
      // Se não existe cobrança, assume dia 10 do mês/ano solicitado
      const dataVenc = bill?.dueDate ? normalizeDate(bill.dueDate) : normalizeDate(`${year}-${month}-10`);
      
      const vencTime = dataVenc.getTime();
      const status = hojeTime > vencTime ? "ATRASADO" : "PENDENTE";

      return { 
        ...p, 
        dueDate: dataVenc.toISOString(), 
        calculatedStatus: status 
      };
    });
}

/**
 * Registra o pagamento de uma mensalidade de forma rápida.
 * Cria o registro se não existir, ou atualiza o existente.
 */
export async function settleMonthlyPayment(
  userId: string, 
  playerId: string, 
  playerName: string, 
  month: number, 
  year: number,
  amount: number
): Promise<void> {
  const referencia = `${String(month).padStart(2, '0')}/${year}`;
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(billsRef, where("jogadorId", "==", playerId), where("referencia", "==", referencia));
  const snap = await getDocs(q);

  if (!snap.empty) {
    // Atualiza o primeiro encontrado que não esteja pago
    const docId = snap.docs[0].id;
    const cobranca = { id: docId, ...snap.docs[0].data() } as Cobranca;
    await payBilling(userId, docId, cobranca, amount);
  } else {
    // Cria novo registro como PAGO
    await addDoc(billsRef, {
      jogadorId: playerId,
      nomeJogador: playerName,
      vinculo: "Mensalista",
      status: "PAGO",
      valor: amount,
      referencia,
      dueDate: normalizeDate(`${year}-${month}-10`) // Salva vencimento padrão se estiver criando na hora
    });

    // Registra no Caixa
    await addTransaction(userId, {
      description: `Pagamento: ${playerName} (${referencia})`,
      amount,
      category: "Mensalidade",
      type: "ENTRADA",
      date: new Date().toISOString(),
      playerId
    });
  }
}
