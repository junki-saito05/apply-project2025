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
    <div>
      <Base />
      <header className="header p-2 shadow-sm">
        <nav className="d-flex w-100 align-items-center">
          <div className="flex-fill">
            <strong>
              <Link href="/dashboard" className="text-white text-decoration-none fs-3">精算システム</Link>
            </strong>
          </div>
          <div className="me-2">
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
      <main className="main-content">{children}</main>
    </div>
  );
}
