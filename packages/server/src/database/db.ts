import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

// Auto-detect cloud databases (Render, Neon, Supabase) that require SSL encryption
const isRemoteCloudDb =
    connectionString?.includes("sslmode=require") ||
    connectionString?.includes("render.com") ||
    connectionString?.includes("neon.tech") ||
    connectionString?.includes("supabase.co");

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: pg.Pool | undefined;
};

// Enable SSL encryption for cloud databases
const pool =
    globalForPrisma.pool ??
    new pg.Pool({
        connectionString,
        ssl: isRemoteCloudDb ? { rejectUnauthorized: false } : undefined,  
    });

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.pool = pool;
}
