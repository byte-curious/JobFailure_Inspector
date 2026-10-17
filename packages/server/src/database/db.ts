//  to make it safe from hot reload use globalThis keyword
import "dotenv/config.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client.js"
import pg from "pg"

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
    prisma : PrismaClient | undefined,
    pool : pg.Pool | undefined
}

// reuse the existing prisma
const pool = globalForPrisma.pool?? new pg.Pool({connectionString})
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({adapter})

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.pool = pool;
}
