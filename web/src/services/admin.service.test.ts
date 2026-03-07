
import { getAdmins, addAdmin, removeAdmin } from "./admin.service";
import { addDoc, getDocs, deleteDoc, doc, collection, query, where, orderBy } from "firebase/firestore";

// Mock do módulo interno lib/firebase
vi.mock("../lib/firebase", () => ({
  db: {},
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "mock-collection"),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

describe("admin.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Freeze tempo
    vi.setSystemTime(new Date("2026-03-03T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── getAdmins ─────────────────────────────────────────────
  describe("getAdmins", () => {
    it("deve retornar todos os admins ordenados por createdAt", async () => {
      const mockDocs = [
        { id: "1", data: () => ({ email: "a@b.com", role: "admin", createdAt: "2026-03-01T" }) },
        { id: "2", data: () => ({ email: "b@b.com", role: "editor", createdAt: "2026-03-02T" }) },
      ];
      (getDocs as any).mockResolvedValue({ docs: mockDocs });

      const result = await getAdmins("user-1");

      expect(where).toHaveBeenCalledWith("ownerUid", "==", "user-1");
      expect(orderBy).toHaveBeenCalledWith("createdAt", "asc");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].email).toBe("b@b.com");
    });
  });

  // ── addAdmin ──────────────────────────────────────────────
  describe("addAdmin", () => {
    it("deve adicionar o e-mail em minúsculas e sem espaços extras salvando createdAt e userId", async () => {
      // Mock para dizer que o e-mail não existe no DB
      (getDocs as any).mockResolvedValue({ empty: true, docs: [] });
      (addDoc as any).mockResolvedValue({ id: "new-admin-id" });

      const novoId = await addAdmin("user-1", "  ADMIN@fut.com  ", "editor");

      expect(where).toHaveBeenCalledWith("email", "==", "admin@fut.com");
      expect(where).toHaveBeenCalledWith("ownerUid", "==", "user-1");
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        email: "admin@fut.com",
        ownerUid: "user-1",
        role: "editor",
        createdAt: "2026-03-03T12:00:00.000Z"
      });
      expect(novoId).toBe("new-admin-id");
    });

    it("deve lançar erro de duplicidade se o e-mail já estiver na lista", async () => {
      // Mock simulando que a query achou o e-mail
      (getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{ id: "admin-existente", data: () => ({}) }]
      });

      await expect(addAdmin("user-1", "teste@fut.com", "admin")).rejects.toThrow("Este e-mail já possui acesso configurado.");

      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  // ── removeAdmin ───────────────────────────────────────────
  describe("removeAdmin", () => {
    it("deve chamar deleteDoc com o id correto", async () => {
      (doc as any).mockReturnValue("docRef-mock");
      (deleteDoc as any).mockResolvedValue(undefined);

      await removeAdmin("user-123");

      expect(doc).toHaveBeenCalledWith(expect.anything(), "tenant_access", "user-123");
      expect(deleteDoc).toHaveBeenCalledWith("docRef-mock");
    });
  });
});
