import { collection, doc, updateDoc, getDocs, query, where, orderBy, addDoc } from "firebase/firestore";
import { db, USERS_COLLECTION } from "../lib/firebase";
import { addTransaction } from "./transaction.service";
import { getPlayers } from "./player.service";

export type StatusCobranca = "pago" | "pendente" | "atrasado";
export type TipoVinculo = "Mensalista" | "Diarista" | "Convidado";

export interface Cobranca {
  id?: string;
  jogadorId: string;
  nomeJogador: string;
  vinculo: TipoVinculo;
  status: StatusCobranca;
  valor: number;
  periodo: string; // Formato YYYY-MM
  referencia: string; // Mantido para compatibilidade em listagens (converte de periodo ou ex: "Partida X")
  dataVencimento: any; // Firestore Timestamp ou Date
  dataPagamento?: any; // Firestore Timestamp ou Date
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

const COLLECTION_NAME = "mensalidades";

/**
 * Busca todas as cobranças que ainda não foram pagas (Pendente ou Atrasado).
 */
export async function getPendingBillings(userId: string): Promise<Cobranca[]> {
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(
    billsRef,
    where("status", "in", ["pendente", "atrasado"])
  );
  
  const querySnapshot = await getDocs(q);
  const hoje = normalizeDate(new Date()).getTime();

  const cobrancas = querySnapshot.docs.map(doc => {
    const data = doc.data() as Omit<Cobranca, "id">;
    let status = data.status;

    if (status === "pendente" && data.dataVencimento) {
      const venc = normalizeDate(data.dataVencimento).getTime();
      if (hoje > venc) status = "atrasado";
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
      await updateDoc(docRef, { 
        status: 'pago',
        dataPagamento: new Date()
      });

      if (diferenca > 0) {
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
      await updateDoc(docRef, {
        valor: cobranca.valor - valorPago
      });
    }

    await addTransaction(userId, {
      description: 'Pagamento: ' + cobranca.nomeJogador + ' (' + (cobranca.periodo || cobranca.referencia) + ')',
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
/**
 * Motor de Faturamento (Billing Engine): Lançamento em massa.
 * Cobre a lógica de idempotência, saldo de crédito e status automático.
 * 
 * @param userId ID do Tenant
 * @param periodo Formato YYYY-MM
 * @param dataVencimento Objeto Date (será normalizado)
 * @param valor Valor da mensalidade para este lote
 */
export async function gerarMensalidadesParaGrupo(
  userId: string, 
  periodo: string, 
  dataVencimento: Date, 
  valor: number
): Promise<number> {
  const jogadores = await getPlayers(userId);
  const mensalistasAtivos = jogadores.filter(j => j.vinculo === "Mensalista" && j.status === "Ativo");

  const normalizedVenc = normalizeDate(dataVencimento);
  const hoje = normalizeDate(new Date()).getTime();
  const vencTime = normalizedVenc.getTime();

  let gerados = 0;

  for (const jogador of mensalistasAtivos) {
    if (!jogador.id) continue;

    const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
    const q = query(
      billsRef,
      where("jogadorId", "==", jogador.id),
      where("periodo", "==", periodo)
    );
    const snap = await getDocs(q);

    // Idempotência: Se já existe registro para esse período, pula
    if (snap.empty) {
      const credito = jogador.creditoAcumulado || 0;
      let status: StatusCobranca = hoje > vencTime ? "atrasado" : "pendente";
      let valorFinal = valor;
      let dataPagamento: any = null;
      let novoCredito = credito;

      // Lógica de abatimento automático de crédito
      if (credito >= valor) {
        status = "pago";
        valorFinal = valor;
        novoCredito = credito - valor;
        dataPagamento = new Date();
      } else if (credito > 0) {
        valorFinal = valor - credito;
        novoCredito = 0;
      }

      await addDoc(billsRef, {
        jogadorId: jogador.id,
        nomeJogador: jogador.nome,
        vinculo: "Mensalista",
        status,
        valor: valorFinal,
        periodo,
        referencia: `${periodo.split("-")[1]}/${periodo.split("-")[0]}`,
        dataVencimento: normalizedVenc,
        dataPagamento
      });

      if (novoCredito !== credito) {
        const jogadorRef = doc(db, USERS_COLLECTION, userId, "jogadores", jogador.id);
        await updateDoc(jogadorRef, { creditoAcumulado: novoCredito });
      }

      // Se foi pago via crédito, opcionalmente registrar no caixa como entrada
      if (status === "pago") {
        await addTransaction(userId, {
          description: `Pagamento (Crédito): ${jogador.nome} (${periodo})`,
          amount: valor,
          category: "Mensalidade",
          type: "ENTRADA",
          date: new Date().toISOString(),
          playerId: jogador.id
        });
      }

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
  const normalizedVenc = normalizeDate(dueDate);
  const hoje = normalizeDate(new Date()).getTime();
  const vencTime = normalizedVenc.getTime();
  
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
        status: hoje > vencTime ? "atrasado" : "pendente",
        valor: amount,
        referencia: `Partida: ${matchTitle} - ${matchId}`,
        periodo: new Date().toISOString().substring(0, 7),
        dataVencimento: normalizedVenc
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
    orderBy("dataVencimento", "desc")
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

  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(billsRef, where("periodo", "==", periodo));
  const snap = await getDocs(q);

  const billsByPlayer: Record<string, Cobranca> = {};
  snap.docs.forEach(d => {
    const data = d.data() as Cobranca;
    billsByPlayer[data.jogadorId] = data;
  });

  const hojeTime = normalizeDate(new Date()).getTime();

  return activeMonthly
    .filter(p => !billsByPlayer[p.id!] || billsByPlayer[p.id!].status !== "pago")
    .map(p => {
      const bill = billsByPlayer[p.id!];
      const dataVenc = bill?.dataVencimento ? normalizeDate(bill.dataVencimento) : normalizeDate(`${year}-${month}-10`);
      
      const vencTime = dataVenc.getTime();
      const status = hojeTime > vencTime ? "atrasado" : "pendente";

      return { 
        ...p, 
        dataVencimento: dataVenc.toISOString(), 
        calculatedStatus: status 
      };
    });
}

/**
 * Busca jogadores mensalistas que já pagaram no mês/ano especificado.
 */
export async function getPaidPayments(userId: string, month: number, year: number): Promise<any[]> {
  const players = await getPlayers(userId);
  const activeMonthly = players.filter(p => p.vinculo === "Mensalista");

  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(billsRef, where("periodo", "==", periodo), where("status", "==", "pago"));
  const snap = await getDocs(q);

  const paidBills: Record<string, Cobranca> = {};
  snap.docs.forEach(d => {
    const data = d.data() as Cobranca;
    paidBills[data.jogadorId] = { id: d.id, ...data };
  });

  return activeMonthly
    .filter(p => p.id && paidBills[p.id])
    .map(p => {
      const bill = paidBills[p.id!];
      const dataPag = bill.dataPagamento ? normalizeDate(bill.dataPagamento) : null;
      return {
        ...p,
        valor: bill.valor,
        dataPagamento: dataPag ? dataPag.toISOString() : null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
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
  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const normalizedVenc = normalizeDate(`${year}-${month}-10`);
  const billsRef = collection(db, USERS_COLLECTION, userId, COLLECTION_NAME);
  const q = query(billsRef, where("jogadorId", "==", playerId), where("periodo", "==", periodo));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docId = snap.docs[0].id;
    const cobranca = { id: docId, ...snap.docs[0].data() } as Cobranca;
    await payBilling(userId, docId, cobranca, amount);
  } else {
    await addDoc(billsRef, {
      jogadorId: playerId,
      nomeJogador: playerName,
      vinculo: "Mensalista",
      status: "pago",
      valor: amount,
      periodo,
      referencia: `${String(month).padStart(2, '0')}/${year}`,
      dataVencimento: normalizedVenc,
      dataPagamento: new Date()
    });

    await addTransaction(userId, {
      description: `Pagamento: ${playerName} (${periodo})`,
      amount,
      category: "Mensalidade",
      type: "ENTRADA",
      date: new Date().toISOString(),
      playerId
    });
  }
}
