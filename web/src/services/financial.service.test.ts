import { describe, it, expect } from "vitest";
import {
  calculateTotalBalance,
  type Transaction,
} from "./financial.service";

describe("calculateTotalBalance", () => {
  it("deve retornar 0 para uma lista vazia", () => {
    expect(calculateTotalBalance([])).toBe(0);
  });

  it("deve somar corretamente apenas entradas (mensalidades)", () => {
    const transacoes: Transaction[] = [
      { id: 1, description: "Mensalidade João", type: "ENTRADA", amount: 80 },
      { id: 2, description: "Mensalidade Pedro", type: "ENTRADA", amount: 80 },
      { id: 3, description: "Avulso Carlos", type: "ENTRADA", amount: 25 },
    ];

    expect(calculateTotalBalance(transacoes)).toBe(185);
  });

  it("deve subtrair corretamente apenas saídas (despesas)", () => {
    const transacoes: Transaction[] = [
      { id: 1, description: "Arbitragem", type: "SAIDA", amount: 150 },
      { id: 2, description: "Aluguel Campo", type: "SAIDA", amount: 300 },
    ];

    expect(calculateTotalBalance(transacoes)).toBe(-450);
  });

  it("deve calcular o saldo correto misturando entradas e saídas", () => {
    const transacoes: Transaction[] = [
      { id: 1, description: "Mensalidade João", type: "ENTRADA", amount: 80 },
      { id: 2, description: "Mensalidade Rafael", type: "ENTRADA", amount: 80 },
      { id: 3, description: "Avulso Carlos", type: "ENTRADA", amount: 25 },
      { id: 4, description: "Mensalidade Thiago", type: "ENTRADA", amount: 80 },
      { id: 5, description: "Mensalidade Gustavo", type: "ENTRADA", amount: 80 },
      { id: 6, description: "Avulso Lucas", type: "ENTRADA", amount: 25 },
      { id: 7, description: "Mensalidade Marcos", type: "ENTRADA", amount: 80 },
      // Entradas: 80+80+25+80+80+25+80 = 450
      { id: 8, description: "Arbitragem Sáb 22/02", type: "SAIDA", amount: 150 },
      { id: 9, description: "Aluguel Campo Fev", type: "SAIDA", amount: 300 },
      { id: 10, description: "Bolas (x2) novas", type: "SAIDA", amount: 90 },
      { id: 11, description: "Água e gelo", type: "SAIDA", amount: 35 },
      // Saídas: 150+300+90+35 = 575
    ];

    // Saldo esperado: 450 - 575 = -125
    expect(calculateTotalBalance(transacoes)).toBe(-125);
  });

  it("deve lidar com transação única de entrada", () => {
    const transacoes: Transaction[] = [
      { id: 1, description: "Mensalidade", type: "ENTRADA", amount: 50 },
    ];

    expect(calculateTotalBalance(transacoes)).toBe(50);
  });

  it("deve lidar com transação única de saída", () => {
    const transacoes: Transaction[] = [
      { id: 1, description: "Arbitragem", type: "SAIDA", amount: 100 },
    ];

    expect(calculateTotalBalance(transacoes)).toBe(-100);
  });
});
