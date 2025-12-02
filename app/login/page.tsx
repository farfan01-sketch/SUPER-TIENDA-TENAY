"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Usuario y contraseña son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      router.push("/pos");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Iniciar sesión</h1>

        {denied && (
          <p className="text-red-600 text-sm text-center">
            Acceso denegado. Inicia sesión para continuar.
          </p>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Usuario:
            </label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 mt-1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña:
            </label>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
