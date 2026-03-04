
import { updatePlayer, addPlayer, getPlayers, promotePlayerToMonthly } from "./player.service";
import { addDoc, getDocs, updateDoc, doc, collection, query, where, orderBy } from "firebase/firestore";

// Mock do módulo interno lib/firebase
vi.mock("../lib/firebase", () => ({
  db: {},
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

describe("player.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── updatePlayer ───────────────────────────────────────────
  describe("updatePlayer", () => {
    it("deve atualizar os dados do jogador com sucesso e sem duplicidade", async () => {
      (doc as any).mockReturnValue("docRef-mock");
      (getDocs as any).mockResolvedValue({ empty: true, docs: [] });

      await updatePlayer("user-1", "doc-1", { nome: "Novo Nome", whatsapp: "11999999999" });

      expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "jogadores", "doc-1");
      expect(updateDoc).toHaveBeenCalledWith("docRef-mock", {
        nome: "Novo Nome",
        whatsapp: "11999999999",
      });
    });

    it("deve permitir a atualização do próprio jogador (mesmo número)", async () => {
      (doc as any).mockReturnValue("docRef-mock");
      (getDocs as any).mockResolvedValue({ empty: false, docs: [{ id: "user-1" }] });

      await expect(
        updatePlayer("user-1", "user-1", { nome: "Novo Nome", whatsapp: "11999999999" })
      ).resolves.not.toThrow();

      expect(updateDoc).toHaveBeenCalled();
    });

    it("deve lancar erro de duplicidade se o WhatsApp for usado por OUTRO ID", async () => {
      (getDocs as any).mockResolvedValue({ empty: false, docs: [{ id: "user-qualquer" }] });

      await expect(
        updatePlayer("user-1", "user-1", { whatsapp: "11999999999" })
      ).rejects.toThrow("Já existe outro jogador cadastrado com este número de WhatsApp.");

      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  // ── getPlayers ─────────────────────────────────────────────
  describe("getPlayers", () => {
    it("sem filtro, deve retornar todos os jogadores ordenados por nome", async () => {
      const mockDocs = [
        { id: "1", data: () => ({ nome: "Ana", vinculo: "Mensalista", status: "Ativo", whatsapp: "11111111111" }) },
        { id: "2", data: () => ({ nome: "Bruno", vinculo: "Diarista", status: "Ativo", whatsapp: "22222222222" }) },
      ];
      (getDocs as any).mockResolvedValue({ docs: mockDocs });

      const result = await getPlayers("user-1");

      expect(orderBy).toHaveBeenCalledWith("nome", "asc");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    it("com filtro 'Espera', deve passar where('vinculo', '==', 'Espera') à query", async () => {
      const mockDocs = [
        { id: "3", data: () => ({ nome: "Carlos", vinculo: "Espera", status: "Ativo", whatsapp: "33333333333" }) },
      ];
      (getDocs as any).mockResolvedValue({ docs: mockDocs });

      const result = await getPlayers("user-1", "Espera");

      expect(where).toHaveBeenCalledWith("vinculo", "==", "Espera");
      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe("Carlos");
    });
  });

  // ── promotePlayerToMonthly ─────────────────────────────────
  describe("promotePlayerToMonthly", () => {
    it("deve chamar updateDoc com { vinculo: 'Mensalista' } para o ID correto", async () => {
      (doc as any).mockReturnValue("docRef-espera");
      (updateDoc as any).mockResolvedValue(undefined);

      await promotePlayerToMonthly("user-1", "jogador-espera-1");

      expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "jogadores", "jogador-espera-1");
      expect(updateDoc).toHaveBeenCalledWith("docRef-espera", { vinculo: "Mensalista" });
    });

    it("deve propagar erros do Firestore se updateDoc falhar", async () => {
      (doc as any).mockReturnValue("docRef-espera");
      (updateDoc as any).mockRejectedValue(new Error("Firestore error"));

      await expect(promotePlayerToMonthly("user-1", "jogador-espera-1")).rejects.toThrow("Firestore error");
    });
  });
});
