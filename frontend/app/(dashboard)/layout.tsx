"use client";

import { ReactNode } from "react";
import Base from "./base";
import Link from "next/link";
import { signOut } from "next-auth/react";
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';

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
            <Button
              variant="contained"
              fullWidth
              endIcon={<LogoutIcon />}
              onClick={handleLogout}
              className="btn btn-outline-light logout"
            >
              ログアウト
            </Button>
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
