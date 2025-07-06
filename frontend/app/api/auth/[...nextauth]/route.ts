import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const djangoApiUrl = process.env.DJANGO_API_URL;

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "ユーザーID", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 1. JWTトークン取得
          const res = await fetch(`${djangoApiUrl}/api/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });
          if (!res.ok) {
            console.error("Token API error:", res.status, await res.text());
            return null;
          }
          const data = await res.json();

          // 2. ユーザー情報取得
          const userRes = await fetch(`${djangoApiUrl}/api/users/me/`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${data.access}`,
            },
          });
          if (!userRes.ok) {
            console.error("User info API error:", userRes.status, await userRes.text());
            return null;
          }
          const userInfo = await userRes.json();

          // 3. userオブジェクトに権限情報も含めて返す
          return {
            id: credentials?.email ?? "",
            email: credentials?.email ?? "",
            username: userInfo.username,
            access: data.access,
            refresh: data.refresh,
            has_master_permission: userInfo.has_master_permission,
          };
        } catch (e) {
          console.error("Authorize error:", e);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // Gmailが登録済か確認
    async signIn({ account, profile }) {
      if (account?.provider === "google" && account.id_token) {
        // Googleのメールアドレス
        const email = profile?.email;
        const res = await fetch(`${djangoApiUrl}/api/users/check-email/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        // 登録されていなければログイン拒否
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.is_registered) return false;
      }
      // 登録済みなら許可
      return true;
    },
    async jwt({ token, account, user }) {
      // Googleログイン時
      if (account && account.provider === "google" && account.id_token) {
        console.log("Google ID Token:", account.id_token);
        // GoogleのIDトークンでDjangoのユーザー情報を取得
        const res = await fetch(`${djangoApiUrl}/api/users/me/google/`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${account.id_token}`,
          },
        });
        token.id_token = account.id_token;
        if (res.ok) {
          const userData = await res.json();
          token.hasMasterPermission = Boolean(userData.has_master_permission);
          token.email = userData.email;
          token.username = userData.username;
        }
      }

      // Credentialsログイン時
      if (account?.provider === "credentials" && user) {
        token.access = user.access;
        token.refresh = user.refresh;
        token.email = user.email;
        token.username = user.username;
        // has_master_permissionはuserオブジェクトから取得
        token.hasMasterPermission = Boolean(user.has_master_permission);
      }

      return token;
    },
    async session({ session, token }) {
      // セッションにJWTトークンや権限情報を含める
      session.user.email = token.email;
      session.user.username = token.username;
      session.access = token.access;
      session.refresh = token.refresh;
      session.user.hasMasterPermission = token.hasMasterPermission === true;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
