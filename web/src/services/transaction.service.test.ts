
import { addTransaction, getTransactions } from "./transaction.service";
import { addDoc, getDocs } from "firebase/firestore";

// Mock do módulo interno lib/firebase (precisamos apenas fazer mock do que exporta)
vi.mock("../lib/firebase", () => ({
  db: {}, // mock do Firestore instance
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

describe("transaction.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar transações do Firestore e mapeá-las corretamente", async () => {
    // Preparar o mock para o getDocs
    const mockDocs = [
      { id: "1", data: () => ({ description: "Mensalidade", type: "ENTRADA", amount: 80, date: "2026-02-25T10:00:00", category: "Mensalidade" }) },
      { id: "2", data: () => ({ description: "Arbitragem", type: "SAIDA", amount: 150, date: "2026-02-26T15:00:00", category: "Arbitragem" }) },
    ];
    (getDocs as any).mockResolvedValue({ docs: mockDocs });
    const { where } = await import("firebase/firestore");

    const transacoes = await getTransactions("user-1");

    expect(transacoes).toHaveLength(2);
    expect(transacoes[0].id).toBe("1");
    expect(transacoes[0].description).toBe("Mensalidade");
    expect(transacoes[1].id).toBe("2");
    expect(transacoes[1].type).toBe("SAIDA");
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it("deve adicionar uma transação corretamente e retornar o ID", async () => {
    // Preparar o mock para o addDoc
    (addDoc as any).mockResolvedValue({ id: "doc-123" });

    const novaTransacao = {
      description: "Bolas Novas",
      type: "SAIDA" as const,
      category: "Bolas",
      amount: 100,
      date: "2026-03-01T10:00:00",
    };

    const id = await addTransaction("user-1", novaTransacao);

    expect(id).toBe("doc-123");
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(undefined, { ...novaTransacao }); // O primeiro argumento é collection(), que mockamos
  });
});
