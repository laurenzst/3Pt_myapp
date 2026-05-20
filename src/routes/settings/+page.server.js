import { db } from "$lib/mongodb.server.js";
import { fail } from "@sveltejs/kit";

export async function load({ locals }) {
  const userId = locals.user.id;
  const currentToken = locals.session?.token;

  const sessions = await db.collection("session")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    sessions: sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress ?? "Unbekannt",
      userAgent: s.userAgent ?? "",
      createdAt: s.createdAt?.toISOString() ?? null,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      isCurrent: s.token === currentToken,
    })),
  };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const name = data.get("name")?.toString().trim();
    const githubUser = data.get("githubUser")?.toString().trim();

    if (!name) return fail(400, { error: "Name darf nicht leer sein." });

    const updates = {
      name,
      image: githubUser ? `https://github.com/${githubUser}.png` : null,
      updatedAt: new Date(),
    };

    if (!githubUser) delete updates.image;

    await db.collection("user").updateOne({ id: userId }, { $set: updates });
  },

  revokeSession: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const sessionId = data.get("sessionId")?.toString();
    if (sessionId) {
      await db.collection("session").deleteOne({ id: sessionId, userId });
    }
  },

  revokeOtherSessions: async ({ locals }) => {
    const userId = locals.user.id;
    const currentToken = locals.session?.token;
    await db.collection("session").deleteMany({
      userId,
      token: { $ne: currentToken },
    });
  },
};
