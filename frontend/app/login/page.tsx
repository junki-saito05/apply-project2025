'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from "next/navigation";
import LoginIcon from '@mui/icons-material/Login';
import HowToReg from '@mui/icons-material/HowToReg';
import Button from '@mui/material/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  let callbackUrl = searchParams.get("callbackUrl") || "/";

  if (callbackUrl === "/") {
    callbackUrl = "/dashboard";
  }

  // Googleでログイン
  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  // Credentials（ID/PW）でサインイン
  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl,
      redirect: false,
    });
    if (res?.error) {
      setError('ログインに失敗しました。ユーザー名またはパスワードを確認してください。');
    } else if (res?.url) {
      window.location.href = res.url;
    }
  };

  return (
    <>
      <header className="header navbar navbar-expand-lg stickey-top p-2 shadow-sm">
        <nav className="d-flex w-100 align-items-center">
          <div className="flex-fill">
            <strong>
              <div className="text-white text-decoration-none fs-3">精算システム</div>
            </strong>
          </div>
        </nav>
      </header>
      <div className="container mt-5" style={{ maxWidth: 400 }}>
        <h1 className="mb-4">ログイン</h1>
        <form onSubmit={handleCredentialsLogin}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              ユーザーID
            </label>
            <input
              id="email"
              name="email"
              type="text"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            endIcon={<LoginIcon />}
            className="w-100"
          >
            ログイン
          </Button>
        </form>
        <hr />
        <Button
          variant="contained"
          color="warning"
          fullWidth
          endIcon={<HowToReg />}
          onClick={handleGoogleLogin}
          className="w-100"
        >
          Googleでログイン
        </Button>
      </div >
    </>
  );
}
