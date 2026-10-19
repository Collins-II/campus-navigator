import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import User from "@/lib/database/models/User";
import { connectToDatabase } from "@/lib/database";
import { logApiError } from "@/lib/database/errors";

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET is required in production. Set it in the deployment environment before starting the app.");
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        studentId: { label: "Student ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.studentId || !credentials?.password) {
          return null;
        }

        const normalizedStudentId = credentials.studentId.trim().toUpperCase();

        try {
          await connectToDatabase();
          const user = await User.findOne({ studentId: normalizedStudentId }).select("+password");

          if (!user || !user.password) {
            return null;
          }

          const isLegacyPassword = !user.password.startsWith("$2");
          let isValidPassword = false;

          if (isLegacyPassword) {
            isValidPassword = credentials.password === user.password;
            if (isValidPassword) {
              user.password = await bcrypt.hash(credentials.password, 10);
              await user.save();
            }
          } else {
            isValidPassword = await bcrypt.compare(credentials.password, user.password);
          }

          if (!isValidPassword) {
            return null;
          }

          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            studentId: user.studentId,
            role: user.role,
          };
        } catch (error) {
          logApiError(error, "auth.credentials");
          throw new Error("Authentication is temporarily unavailable.");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.studentId = (user as { studentId?: string }).studentId ?? token.sub ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string | undefined) ?? "student";
        session.user.studentId = (token.studentId as string | undefined) ?? "";
      }
      return session;
    },
  },
};
