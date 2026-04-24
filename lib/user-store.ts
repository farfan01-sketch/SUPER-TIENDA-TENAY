import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export type AppUser = {
  _id: string;
  username: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  permissions: {
    canSell: boolean;
    canManageProducts: boolean;
    canSeeReports: boolean;
    canDoCashCuts: boolean;
    canCancelSales: boolean;
    canManageUsers: boolean;
    canAccessConfig: boolean;
  };
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

const adminPermissions = {
  canSell: true,
  canManageProducts: true,
  canSeeReports: true,
  canDoCashCuts: true,
  canCancelSales: true,
  canManageUsers: true,
  canAccessConfig: true,
};

const cashierPermissions = {
  canSell: true,
  canManageProducts: false,
  canSeeReports: false,
  canDoCashCuts: false,
  canCancelSales: false,
  canManageUsers: false,
  canAccessConfig: false,
};

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(usersFile);
  } catch {
    const adminUser: AppUser = {
      _id: crypto.randomUUID(),
      username: "admin",
      passwordHash: await bcrypt.hash("1234", 10),
      role: "admin",
      isActive: true,
      permissions: adminPermissions,
      createdAt: new Date().toISOString(),
    };

    await fs.writeFile(usersFile, JSON.stringify([adminUser], null, 2), "utf8");
  }
}

export async function getUsers(): Promise<AppUser[]> {
  await ensureStore();
  const raw = await fs.readFile(usersFile, "utf8");
  return JSON.parse(raw) as AppUser[];
}

export async function saveUsers(users: AppUser[]) {
  await ensureStore();
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByUsername(username: string) {
  const users = await getUsers();
  return users.find(
    (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
  );
}

export async function createUser(input: {
  username: string;
  password: string;
  role: string;
  isActive: boolean;
}) {
  const users = await getUsers();

  const exists = users.some(
    (u) => u.username.trim().toLowerCase() === input.username.trim().toLowerCase()
  );

  if (exists) {
    throw new Error("Ese usuario ya existe");
  }

  const role = input.role?.toLowerCase() === "admin" ? "admin" : "cashier";

  const newUser: AppUser = {
    _id: crypto.randomUUID(),
    username: input.username.trim(),
    passwordHash: await bcrypt.hash(input.password, 10),
    role,
    isActive: Boolean(input.isActive),
    permissions: role === "admin" ? adminPermissions : cashierPermissions,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  return newUser;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<AppUser, "role" | "isActive" | "permissions">>
) {
  const users = await getUsers();
  const index = users.findIndex((u) => u._id === id);

  if (index === -1) {
    throw new Error("Usuario no encontrado");
  }

  users[index] = {
    ...users[index],
    ...patch,
    permissions: patch.permissions ?? users[index].permissions,
  };

  await saveUsers(users);
  return users[index];
}