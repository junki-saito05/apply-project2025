import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/master")) {
      // セッション情報から権限を判定
      const hasMasterPermission = req.nextauth.token?.hasMasterPermission;
      if (!hasMasterPermission) {
        // 権限なしならダッシュボードへリダイレクト
        const url = new URL("/dashboard", req.url);
        url.searchParams.set("error", "no-permission");
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next|login|favicon.ico).*)",
  ],
};
