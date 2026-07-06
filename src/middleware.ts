import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    if (pathname === "/login" && token) {
      if (role === "dealer") return NextResponse.redirect(new URL("/dealer", req.url));
      if (role === "subscriber") return NextResponse.redirect(new URL("/dashboard/crawler", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // subscriber는 /dashboard/crawler 외 접근 불가
    if (role === "subscriber" && pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/crawler")) {
      return NextResponse.redirect(new URL("/dashboard/crawler", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/login") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/dealer/:path*", "/login"],
};
