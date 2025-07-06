'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Credentials（ID/PW）でサインイン
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/dashboard',
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
        <form onSubmit={handleSubmit}>
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
          <button type="submit" className="btn btn-primary w-100">
            ログイン
          </button>
        </form>
        <hr />
        <button
          className="btn btn-danger w-100"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          style={{ marginTop: 16 }}
        >
          Googleでログイン
        </button>
      </div>
    </>
  );
}
