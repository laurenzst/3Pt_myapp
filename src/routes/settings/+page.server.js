import { db } from "$lib/mongodb.server.js";
import { auth } from "$lib/auth.server.js";
import { ObjectId } from "mongodb";
import { fail } from "@sveltejs/kit";

export async function load({ locals }) {
  const userId = locals.user.id;
  const currentToken = locals.session?.token;

  const [sessions, user] = await Promise.all([
    db.collection("session")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection("user").findOne({ _id: new ObjectId(userId) }, { projection: { twoFactorEnabled: 1 } }),
  ]);

  return {
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    sessions: sessions.map(s => ({
      id: s._id.toString(),
      token: s.token,
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? "",
      createdAt: s.createdAt?.toISOString() ?? null,
      updatedAt: s.updatedAt?.toISOString() ?? null,
      isCurrent: s.token === currentToken,
    })),
  };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const name = data.get("name")?.toString().trim();

    if (!name) return fail(400, { error: "Name darf nicht leer sein." });

    await db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { name, updatedAt: new Date() } }
    );
  },

  changePassword: async ({ request }) => {
    const data = await request.formData();
    const currentPassword = data.get("currentPassword")?.toString();
    const newPassword = data.get("newPassword")?.toString();
    const confirmPassword = data.get("confirmPassword")?.toString();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { pwError: "Alle Felder sind erforderlich." });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { pwError: "Die Passwörter stimmen nicht überein." });
    }
    if (newPassword.length < 8) {
      return fail(400, { pwError: "Das neue Passwort muss mindestens 8 Zeichen haben." });
    }

    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: false },
        headers: request.headers,
      });
    } catch (e) {
      const code = e?.body?.code;
      if (code === "INVALID_PASSWORD") {
        return fail(400, { pwError: "Das aktuelle Passwort ist falsch." });
      }
      return fail(400, { pwError: "Passwort konnte nicht geändert werden." });
    }

    return { pwSuccess: true };
  },

  revokeSession: async ({ request }) => {
    const data = await request.formData();
    const token = data.get("token")?.toString();
    if (token) {
      await auth.api.revokeSession({ body: { token }, headers: request.headers });
    }
  },

  revokeOtherSessions: async ({ request }) => {
    await auth.api.revokeOtherSessions({ headers: request.headers });
  },
};
