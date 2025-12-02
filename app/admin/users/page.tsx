"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type UserRole = "admin" | "supervisor" | "encargado" | "cajero";

type Permissions = {
  canSell: boolean;
  canManageProducts: boolean;
  canSeeReports: boolean;
  canDoCashCuts: boolean;
  canCancelSales: boolean;
  canManageUsers: boolean;
  canAccessConfig: boolean;
};

type User = {
  _id: string;
  username: string;
  role: UserRole;
  permissions: Permissions;
  isActive: boolean;
  createdAt: string;
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<{
    username: string;
    password: string;
    role: UserRole;
    permissions: Permissions;
    isActive: boolean;
  }>({
    username: "",
    password: "",
    role: "cajero",
    isActive: true,
    permissions: {
      canSell: true,
      canManageProducts: false,
      canSeeReports: false,
      canDoCashCuts: false,
      canCancelSales: false,
      canManageUsers: false,
      canAccessConfig: false,
    },
  });

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadUsers() {
    try {
      setLoading(true);
      clearMessages();
      const res = await fetch("/api/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar usuarios"
        );
      }
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleNewRoleChange(role: UserRole) {
    setNewUser((prev) => {
      let perms = { ...prev.permissions };
      if (role === "admin") {
        perms = {
          canSell: true,
          canManageProducts: true,
          canSeeReports: true,
          canDoCashCuts: true,
          canCancelSales: true,
          canManageUsers: true,
          canAccessConfig: true,
        };
      } else if (role === "supervisor") {
        perms = {
          canSell: true,
          canManageProducts: true,
          canSeeReports: true,
          canDoCashCuts: true,
          canCancelSales: true,
          canManageUsers: false,
          canAccessConfig: false,
        };
      } else if (role === "encargado") {
        perms = {
          canSell: true,
          canManageProducts: true,
          canSeeReports: true,
          canDoCashCuts: true,
          canCancelSales: false,
          canManageUsers: false,
          canAccessConfig: false,
        };
      } else {
        perms = {
          canSell: true,
          canManageProducts: false,
          canSeeReports: false,
          canDoCashCuts: false,
          canCancelSales: false,
          canManageUsers: false,
          canAccessConfig: false,
        };
      }
      return { ...prev, role, permissions: perms };
    });
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!newUser.username || !newUser.password) {
      setError("Usuario y contraseña son obligatorios");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Error al crear usuario"
        );
      }

      await loadUsers();
      setSuccess("Usuario creado correctamente");

      setNewUser({
        username: "",
        password: "",
        role: "cajero",
        isActive: true,
        permissions: {
          canSell: true,
          canManageProducts: false,
          canSeeReports: false,
          canDoCashCuts: false,
          canCancelSales: false,
          canManageUsers: false,
          canAccessConfig: false,
        },
      });
    } catch (e: any) {
      setError(e.message || "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateUser(user: User) {
    clearMessages();
    try {
      setSavingId(user._id);
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Error al actualizar usuario"
        );
      }

      await loadUsers();
      setSuccess("Usuario actualizado correctamente");
    } catch (e: any) {
      setError(e.message || "Error al actualizar usuario");
    } finally {
      setSavingId(null);
    }
  }

  function togglePermission(
    userId: string,
    key: keyof Permissions
  ) {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId
          ? {
              ...u,
              permissions: {
                ...u.permissions,
                [key]: !u.permissions[key],
              },
            }
          : u
      )
    );
  }

  function changeUserRole(userId: string, role: UserRole) {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId ? { ...u, role } : u
      )
    );
  }

  function toggleUserActive(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId
          ? { ...u, isActive: !u.isActive }
          : u
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Usuarios y permisos
            </h1>
            <p className="text-sm text-slate-600">
              Administra cajeros, roles y acceso a módulos
              del sistema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
              Super Tienda Tenay POS
            </span>
            <Link
              href="/pos"
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              Ir al POS
            </Link>
          </div>
        </header>

        {/* Crear usuario */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Nuevo usuario
          </h2>
          <form
            onSubmit={handleCreateUser}
            className="grid gap-4 md:grid-cols-4 md:items-end"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Usuario
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Rol
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={newUser.role}
                onChange={(e) =>
                  handleNewRoleChange(
                    e.target.value as UserRole
                  )
                }
              >
                <option value="admin">Admin</option>
                <option value="supervisor">
                  Supervisor
                </option>
                <option value="encargado">
                  Encargado
                </option>
                <option value="cajero">Cajero</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="newActive"
                  type="checkbox"
                  checked={newUser.isActive}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="newActive"
                  className="text-xs font-medium text-slate-700"
                >
                  Activo
                </label>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="ml-auto rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {creating
                  ? "Creando..."
                  : "Crear usuario"}
              </button>
            </div>
          </form>
          <p className="mt-2 text-[10px] text-slate-500">
            El rol define permisos base, que puedes ajustar
            abajo usuario por usuario.
          </p>
        </section>

        {error && (
          <div className="rounded-md bg-red-100 px-4 py-2 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-emerald-100 px-4 py-2 text-xs text-emerald-800 border border-emerald-200">
            {success}
          </div>
        )}

        {/* Lista de usuarios */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Usuarios
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500">
                Cargando...
              </span>
            )}
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay usuarios (además del admin inicial).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Usuario
                    </th>
                    <th className="px-2 py-2 text-left">
                      Rol
                    </th>
                    <th className="px-2 py-2 text-left">
                      Permisos
                    </th>
                    <th className="px-2 py-2 text-center">
                      Activo
                    </th>
                    <th className="px-2 py-2 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-2">
                        <div className="font-semibold">
                          {u.username}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Alta:{" "}
                          {new Date(
                            u.createdAt
                          ).toLocaleString("es-MX", {
                            year: "2-digit",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={u.role}
                          onChange={(e) =>
                            changeUserRole(
                              u._id,
                              e.target
                                .value as UserRole
                            )
                          }
                        >
                          <option value="admin">
                            Admin
                          </option>
                          <option value="supervisor">
                            Supervisor
                          </option>
                          <option value="encargado">
                            Encargado
                          </option>
                          <option value="cajero">
                            Cajero
                          </option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          {(
                            [
                              [
                                "canSell",
                                "Vender",
                              ],
                              [
                                "canManageProducts",
                                "Productos",
                              ],
                              [
                                "canSeeReports",
                                "Reportes",
                              ],
                              [
                                "canDoCashCuts",
                                "Corte caja",
                              ],
                              [
                                "canCancelSales",
                                "Cancelar",
                              ],
                              [
                                "canManageUsers",
                                "Usuarios",
                              ],
                              [
                                "canAccessConfig",
                                "Config.",
                              ],
                            ] as [keyof Permissions, string][]
                          ).map(([key, label]) => (
                            <label
                              key={key}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-700"
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={
                                  u.permissions[key]
                                }
                                onChange={() =>
                                  togglePermission(
                                    u._id,
                                    key
                                  )
                                }
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserActive(u._id)
                          }
                          className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {u.isActive
                            ? "Activo"
                            : "Inactivo"}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          disabled={savingId === u._id}
                          onClick={() =>
                            handleUpdateUser(u)
                          }
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
                        >
                          {savingId === u._id
                            ? "Guardando..."
                            : "Guardar cambios"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
