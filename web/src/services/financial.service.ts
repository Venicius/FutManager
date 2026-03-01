/**
 * Serviço financeiro isolado — regras de negócio puras.
 * Sem dependências de UI, framework ou banco de dados.
 */

export type TipoTransacao = "ENTRADA" | "SAIDA";

export interface Transaction {
  id?: string | number;
  description: string;
  type: TipoTransacao;
  amount: number; // sempre positivo; o tipo determina o sinal
}

/**
 * Calcula o saldo total a partir de uma lista de transações.
 *
 * - Transações do tipo `ENTRADA` somam ao saldo.
 * - Transações do tipo `SAIDA` subtraem do saldo.
 *
 * @returns O saldo final (pode ser negativo).
 */
export function calculateTotalBalance(transactions: Transaction[]): number {
  return transactions.reduce((balance, tx) => {
    return tx.type === "ENTRADA"
      ? balance + tx.amount
      : balance - tx.amount;
  }, 0);
}
