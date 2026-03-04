
import { generateMatchBillings, generateMonthlyBillings, payBilling } from "./billing.service";
import { addDoc, getDocs, query, where, collection, updateDoc, doc } from "firebase/firestore";
import { getPlayers } from "./player.service";
import { addTransaction } from "./transaction.service";

// Mock do módulo interno lib/firebase
vi.mock("../lib/firebase", () => ({
  db: {}, // mock do Firestore instance
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((db, ...paths) => paths.join("/")),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn((db, ...paths) => paths.join("/")),
  updateDoc: vi.fn(),
}));

// Mock dos serviços
vi.mock("./player.service", () => ({
  getPlayers: vi.fn(),
}));

vi.mock("./transaction.service", () => ({
  addTransaction: vi.fn(),
}));

describe("billing.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMonthlyBillings", () => {
    it("deve abater valor total se jogador tiver crédito suficiente", async () => {
      const players = [
        { id: "p1", nome: "User 1", vinculo: "Mensalista", status: "Ativo", creditoAcumulado: 60 }
      ];
      (getPlayers as any).mockResolvedValue(players);
      (getDocs as any).mockResolvedValue({ empty: true });
      (addDoc as any).mockResolvedValue({ id: "billing-1" });

      const gerados = await generateMonthlyBillings("user-1", 50, "2026-03-05");

      expect(gerados).toBe(1);
      // Deve ter criado cobrança como PAGO na coleção cobrancas
      // path é retornado por: collection(db, "users", "user-1", "cobrancas") => "users/user-1/cobrancas"
      expect(addDoc).toHaveBeenCalledWith("users/user-1/cobrancas", expect.objectContaining({
        status: "PAGO",
        valor: 50
      }));
      // Deve ter atualizado o jogador para crédito de 10
      expect(updateDoc).toHaveBeenCalledWith("users/user-1/jogadores/p1", { creditoAcumulado: 10 });
    });

    it("deve abater parcial se jogador tiver crédito menor que o valor", async () => {
      const players = [
        { id: "p2", nome: "User 2", vinculo: "Mensalista", status: "Ativo", creditoAcumulado: 20 }
      ];
      (getPlayers as any).mockResolvedValue(players);
      (getDocs as any).mockResolvedValue({ empty: true });

      const gerados = await generateMonthlyBillings("user-1", 50, "2026-03-05");

      expect(gerados).toBe(1);
      // Deve ter criado cobrança como PENDENTE com valor de 30
      expect(addDoc).toHaveBeenCalledWith("users/user-1/cobrancas", expect.objectContaining({
        status: "PENDENTE",
        valor: 30
      }));
      // Deve ter zerado o crédito do jogador
      expect(updateDoc).toHaveBeenCalledWith("users/user-1/jogadores/p2", { creditoAcumulado: 0 });
    });
  });

  describe("payBilling", () => {
    it("deve gerar crédito se pagar a mais", async () => {
      const cobranca = { id: "c1", userId: "user-1", jogadorId: "p1", nomeJogador: "User 1", valor: 50, vinculo: "Mensalista", referencia: "03/2026" };
      (getPlayers as any).mockResolvedValue([{ id: "p1", creditoAcumulado: 0 }]);
      
      await payBilling("user-1", "c1", cobranca as any, 70);

      // Cobrança fica PAGO
      expect(updateDoc).toHaveBeenCalledWith("users/user-1/cobrancas/c1", { status: "PAGO" });
      // Adiciona 20 de crédito
      expect(updateDoc).toHaveBeenCalledWith("users/user-1/jogadores/p1", { creditoAcumulado: 20 });
      // Registra transação de 70 reais
      expect(addTransaction).toHaveBeenCalledWith("user-1", expect.objectContaining({ amount: 70 }));
    });

    it("deve abater valor pendente se pagar a menos", async () => {
      const cobranca = { id: "c2", userId: "user-1", jogadorId: "p2", nomeJogador: "User 2", valor: 50, vinculo: "Mensalista", referencia: "03/2026" };
      
      await payBilling("user-1", "c2", cobranca as any, 30);

      // Apenas o valor da cobrança muda para 20
      expect(updateDoc).toHaveBeenCalledWith("users/user-1/cobrancas/c2", { valor: 20 });
      // Registra transação de 30 reais
      expect(addTransaction).toHaveBeenCalledWith("user-1", expect.objectContaining({ amount: 30 }));
    });
  });

  describe("generateMatchBillings", () => {
    it("deve criar cobrança apenas para os Diaristas presentes", async () => {
      const matchId = "match-123";
      const matchTitle = "Pelada Teste";
      const presentPlayerIds = ["player-1", "player-2"];
      const amount = 25;
      const dueDate = "2026-03-10T23:59:59";
      
      const allPlayers = [
        { id: "player-1", nome: "João Mensalista", vinculo: "Mensalista", status: "Ativo" },
        { id: "player-2", nome: "Pedro Diarista", vinculo: "Diarista", status: "Ativo" },
        { id: "player-3", nome: "Carlos Diarista", vinculo: "Diarista", status: "Ativo" },
      ];

      (getDocs as any).mockResolvedValue({ empty: true });
      (addDoc as any).mockResolvedValue({ id: "nova-cobranca-id" });

      const gerados = await generateMatchBillings("user-1", matchId, matchTitle, presentPlayerIds, allPlayers, amount, dueDate);

      expect(gerados).toBe(1);
      expect(addDoc).toHaveBeenCalledWith("users/user-1/cobrancas", expect.objectContaining({
        status: "PENDENTE"
      }));
    });
  });
});
