"use client";

import { ReactNode } from "react";
import Base from "./base";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // ログアウト処理
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };
  return (
    <>
      <header className="header navbar navbar-expand-lg stickey-top p-2 shadow-sm">
        <nav className="d-flex w-100 align-items-center">
          <div className="flex-fill">
            <strong>
              <Link href="/dashboard" className="text-white text-decoration-none fs-3">精算システム</Link>
            </strong>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-outline-light logout"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </nav>
      </header>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Base />
        <main style={{ flex: 1, padding: 32 }}>{children}</main>
      </div>
    </>
  );
}
