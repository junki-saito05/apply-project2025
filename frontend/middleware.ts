import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trip/:path*",
    "/user/:path*",
    "/department/:path*",
    "/approval/:path*",
    "/allowance/:path*",
  ],
};
