
import { createMatch, getMatches, toggleAttendance, updateMatch, deleteMatch } from "./match.service";
import { addDoc, getDocs, updateDoc, deleteDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";

// Mock do módulo interno lib/firebase
vi.mock("../lib/firebase", () => ({
  db: {}, // mock do Firestore instance
}));

// Mock do firebase/firestore
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  arrayUnion: vi.fn((val) => val), // mock simple pass-through
  arrayRemove: vi.fn((val) => val),
}));

describe("match.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar uma nova partida e retornar o id", async () => {
    (addDoc as any).mockResolvedValue({ id: "match-123" });

    const id = await createMatch("user-1", "Pelada de Sábado", "2026-03-07T15:00:00");

    expect(id).toBe("match-123");
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(undefined, {
      titulo: "Pelada de Sábado",
      data: "2026-03-07T15:00:00",
      presentPlayers: []
    });
  });

  it("deve listar partidas ordenadas filtrando por userId", async () => {
    const mockDocs = [
      { id: "1", data: () => ({ userId: "user-1", titulo: "Partida 1", data: "2026-03-01T10:00:00", presentPlayers: ["player1"] }) },
    ];
    (getDocs as any).mockResolvedValue({ docs: mockDocs });
    const { where } = await import("firebase/firestore");

    const matches = await getMatches("user-1");

    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("1");
    expect(matches[0].titulo).toBe("Partida 1");
    expect(matches[0].presentPlayers).toContain("player1");
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it("deve marcar presença (arrayUnion)", async () => {
    (doc as any).mockReturnValue("docRef-mock");
    await toggleAttendance("user-1", "match-1", "player-1", true);

    expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "partidas", "match-1");
    expect(arrayUnion).toHaveBeenCalledWith("player-1");
    expect(updateDoc).toHaveBeenCalledWith("docRef-mock", {
      presentPlayers: "player-1" // arrayUnion returns the value as we mocked above
    });
  });

  it("deve desmarcar presença (arrayRemove)", async () => {
    (doc as any).mockReturnValue("docRef-mock");
    await toggleAttendance("user-1", "match-1", "player-1", false);

    expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "partidas", "match-1");
    expect(arrayRemove).toHaveBeenCalledWith("player-1");
    expect(updateDoc).toHaveBeenCalledWith("docRef-mock", {
      presentPlayers: "player-1" // arrayRemove returns the value as we mocked above
    });
  });

  it("deve atualizar os dados de uma partida", async () => {
    (doc as any).mockReturnValue("docRef-mock");
    
    await updateMatch("user-1", "match-1", { titulo: "Novo Titulo" });

    expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "partidas", "match-1");
    expect(updateDoc).toHaveBeenCalledWith("docRef-mock", {
      titulo: "Novo Titulo"
    });
  });

  it("deve excluir uma partida", async () => {
    (doc as any).mockReturnValue("docRef-mock");
    
    await deleteMatch("user-1", "match-1");

    expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-1", "partidas", "match-1");
    expect(deleteDoc).toHaveBeenCalledWith("docRef-mock");
  });
});
