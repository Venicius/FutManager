
import { getUserProfile, updateUserProfile } from "./user.service";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Mock do módulo interno lib/firebase
vi.mock("../lib/firebase", () => ({
  db: {},
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("deve retornar null se o documento não existir", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => false,
      });

      const profile = await getUserProfile("user-1");
      expect(profile).toBeNull();
    });

    it("deve retornar os dados do perfil se o documento existir", async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ nome: "João", telefone: "11999999999" }),
      });

      const profile = await getUserProfile("user-1");
      expect(profile).toEqual({ nome: "João", telefone: "11999999999" });
    });
  });

  describe("updateUserProfile", () => {
    it("deve chamar setDoc com merge: true usando o doc id como userId", async () => {
      (doc as any).mockReturnValue("docRef-user-1");
      
      await updateUserProfile("user-1", { nome: "Maria" });

      expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1");
      expect(setDoc).toHaveBeenCalledWith("docRef-user-1", { nome: "Maria" }, { merge: true });
    });
  });
});
