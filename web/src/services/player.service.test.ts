import { describe, it, expect, vi, beforeEach } from "vitest";
import { updatePlayer, addPlayer, getPlayers } from "./player.service";
import { addDoc, getDocs, updateDoc, doc, collection, query, where } from "firebase/firestore";

// Mock do módulo interno lib/firebase
vi.mock("@/lib/firebase", () => ({
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

  describe("updatePlayer", () => {
    it("deve atualizar os dados do jogador com sucesso e sem duplicidade", async () => {
      (doc as any).mockReturnValue("docRef-mock");
      // Simulando que não existe NENHUM outro doc com o mesmo whatsApp
      (getDocs as any).mockResolvedValue({
        empty: true,
        docs: []
      });

      await updatePlayer("user-1", {
        nome: "Novo Nome",
        whatsapp: "11999999999",
      });

      expect(doc).toHaveBeenCalledWith(expect.anything(), "jogadores", "user-1");
      expect(updateDoc).toHaveBeenCalledWith("docRef-mock", {
        nome: "Novo Nome",
        whatsapp: "11999999999"
      });
    });

    it("deve permitir a atualização do próprio jogador (mesmo número)", async () => {
       (doc as any).mockReturnValue("docRef-mock");
       // Simulando que o getDocs achou esse mesmo número, mas O MESMO ID
       (getDocs as any).mockResolvedValue({
         empty: false,
         docs: [{ id: "user-1" }] // O id q vamos passar
       });
 
       await expect(updatePlayer("user-1", {
         nome: "Novo Nome",
         whatsapp: "11999999999",
       })).resolves.not.toThrow();
 
       expect(updateDoc).toHaveBeenCalled();
    });

    it("deve lancar erro de duplicidade se o WhatsApp for usado por OUTRO ID", async () => {
      // Simulando que o getDocs achou o numero pertencendo a outro ID
      (getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{ id: "user-qualquer" }] 
      });

      await expect(updatePlayer("user-1", {
        whatsapp: "11999999999",
      })).rejects.toThrow("Já existe outro jogador cadastrado com este número de WhatsApp.");

      expect(updateDoc).not.toHaveBeenCalled();
    });
  });
});
