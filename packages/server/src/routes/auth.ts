import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../database/db.js";

// Helper to generate  project API keys
export function generateApiKey(): string {
    const token = crypto.randomBytes(24).toString("hex");
    return `insp_live_${token}`;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {

    // 1. POST /v1/auth/signup (Email & Password)
    fastify.post<{
        Body: { email: string; password: string; name?: string; projectName?: string };
    }>("/v1/auth/signup", {
        schema: {
            body: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    name: { type: "string" },
                    projectName: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { email, password, name, projectName } = request.body;
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return reply.code(409).send({
                error: "CONFLICT",
                message: "An account with this email address already exists.",
            });
        }

        // Hash password with 10 salt rounds
        const passwordHash = await bcrypt.hash(password, 10);
        const apiKey = generateApiKey();
        const pName = projectName || `${name ? `${name}'s` : "Default"} Project`;
        const slug = pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Create User + Default Project atomically in a transaction
        const { user, project } = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    name: name || null,
                    passwordHash,
                },
            });

            const newProject = await tx.project.create({
                data: {
                    name: pName,
                    slug: `${slug}-${crypto.randomBytes(3).toString("hex")}`,
                    apiKey,
                    userId: newUser.id,
                },
            });

            return { user: newUser, project: newProject };
        });

        // Sign JWT token
        const token = fastify.jwt.sign({
            userId: user.id,
            email: user.email,
        });

        return reply.code(201).send({
            token,
            user: { id: user.id, email: user.email, name: user.name },
            project: { id: project.id, name: project.name, apiKey: project.apiKey },
        });
    });

    // 2. POST /v1/auth/login (Email & Password)
    fastify.post<{
        Body: { email: string; password: string };
    }>("/v1/auth/login", {
        schema: {
            body: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                },
            },
        },
    }, async (request, reply) => {
        const { email, password } = request.body;
        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                projects: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!user || !user.passwordHash) {
            return reply.code(401).send({
                error: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return reply.code(401).send({
                error: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
            });
        }

        const token = fastify.jwt.sign({
            userId: user.id,
            email: user.email,
        });

        const defaultProject = user.projects[0];

        return reply.send({
            token,
            user: { id: user.id, email: user.email, name: user.name },
            projects: user.projects.map((p) => ({
                id: p.id,
                name: p.name,
                apiKey: p.apiKey,
                webhookUrl: p.webhookUrl,
            })),
            activeProject: defaultProject
                ? { id: defaultProject.id, name: defaultProject.name, apiKey: defaultProject.apiKey }
                : null,
        });
    });

    // 3. GET /v1/auth/me (Get Authenticated User Profile & Active Projects)
    fastify.get("/v1/auth/me", async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            return reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
        }

        const decoded = (request.user as { userId: string });
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                projects: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!user) {
            return reply.code(404).send({ error: "NOT_FOUND", message: "User not found." });
        }

        return reply.send({
            user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
            projects: user.projects.map((p) => ({
                id: p.id,
                name: p.name,
                apiKey: p.apiKey,
                webhookUrl: p.webhookUrl,
            })),
        });
    });

    // 4. GITHUB OAUTH: GET /v1/auth/github & /v1/auth/callback/github
    fastify.get("/v1/auth/github", async (request, reply) => {
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            return reply.code(500).send({ error: "CONFIGURATION_ERROR", message: "GITHUB_CLIENT_ID not configured." });
        }
        const redirectUri = `${process.env.PUBLIC_URL || "http://localhost:3000"}/v1/auth/callback/github`;
        const scope = "user:email read:user";
        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
        return reply.redirect(url);
    });

    fastify.get<{ Querystring: { code?: string } }>("/v1/auth/callback/github", async (request, reply) => {
        const { code } = request.query;
        if (!code) {
            return reply.redirect("/?error=github_missing_code");
        }

        try {
            // Exchange code for access token
            const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                }),
            });
            const tokenData = await tokenRes.json() as any;
            const accessToken = tokenData.access_token;

            if (!accessToken) {
                return reply.redirect("/?error=github_token_exchange_failed");
            }

            // Fetch GitHub profile & primary email
            const [userRes, emailsRes] = await Promise.all([
                fetch("https://api.github.com/user", {
                    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "JobInspector" },
                }),
                fetch("https://api.github.com/user/emails", {
                    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "JobInspector" },
                }),
            ]);

            const profile = await userRes.json() as any;
            const emails = await emailsRes.json() as any;
            const primaryEmail = emails.find((e: any) => e.primary && e.verified)?.email || profile.email;

            if (!primaryEmail) {
                return reply.redirect("/?error=github_no_verified_email");
            }

            // Upsert User and Account Linking
            const apiKey = generateApiKey();
            const { user } = await prisma.$transaction(async (tx) => {
                let u = await tx.user.findFirst({
                    where: {
                        OR: [{ githubId: String(profile.id) }, { email: primaryEmail.toLowerCase() }],
                    },
                });

                if (!u) {
                    u = await tx.user.create({
                        data: {
                            email: primaryEmail.toLowerCase(),
                            name: profile.name || profile.login,
                            avatarUrl: profile.avatar_url,
                            githubId: String(profile.id),
                        },
                    });

                    // Create initial default project
                    await tx.project.create({
                        data: {
                            name: "My Project",
                            slug: `project-${crypto.randomBytes(3).toString("hex")}`,
                            apiKey,
                            userId: u.id,
                        },
                    });
                } 
                else if (!u.githubId) {
                    // Account link
                    u = await tx.user.update({
                        where: { id: u.id },
                        data: { githubId: String(profile.id), avatarUrl: profile.avatar_url },
                    });
                }

                return { user: u };
            });

            // Sign JWT
            const sessionToken = fastify.jwt.sign({ userId: user.id, email: user.email });

            // Redirect to frontend with token
            return reply.redirect(`/?token=${sessionToken}`);
        } catch (err) {
            request.log.error(err);
            return reply.redirect("/?error=github_oauth_error");
        }
    });

    // 5. GOOGLE OAUTH: GET /v1/auth/google & /v1/auth/callback/google
    fastify.get("/v1/auth/google", async (request, reply) => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return reply.code(500).send({ error: "CONFIGURATION_ERROR", message: "GOOGLE_CLIENT_ID not configured." });
        }
        const redirectUri = `${process.env.PUBLIC_URL || "http://localhost:3000"}/v1/auth/callback/google`;
        const scope = "openid email profile";
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
        return reply.redirect(url);
    });

    fastify.get<{ Querystring: { code?: string } }>("/v1/auth/callback/google", async (request, reply) => {
        const { code } = request.query;
        if (!code) return reply.redirect("/?error=google_missing_code");

        try {
            // Exchange code for Google tokens
            const redirectUri = `${process.env.PUBLIC_URL || "http://localhost:3000"}/v1/auth/callback/google`;
            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID || "",
                    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            });
            const tokenData = await tokenRes.json() as any;

            // Fetch Google Profile
            const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const profile = await profileRes.json() as any;

            if (!profile.email) {
                return reply.redirect("/?error=google_no_email");
            }

            // Upsert User and Account Linking
            const apiKey = generateApiKey();
            const { user } = await prisma.$transaction(async (tx) => {
                let u = await tx.user.findFirst({
                    where: {
                        OR: [{ googleId: profile.id }, { email: profile.email.toLowerCase() }],
                    },
                });

                if (!u) {
                    u = await tx.user.create({
                        data: {
                            email: profile.email.toLowerCase(),
                            name: profile.name,
                            avatarUrl: profile.picture,
                            googleId: profile.id,
                        },
                    });

                    await tx.project.create({
                        data: {
                            name: "My Project",
                            slug: `project-${crypto.randomBytes(3).toString("hex")}`,
                            apiKey,
                            userId: u.id,
                        },
                    });
                } else if (!u.googleId) {
                    u = await tx.user.update({
                        where: { id: u.id },
                        data: { googleId: profile.id, avatarUrl: profile.picture },
                    });
                }
                return { user: u };
            });

            const sessionToken = fastify.jwt.sign({ userId: user.id, email: user.email });
            return reply.redirect(`/?token=${sessionToken}`);
        } catch (err) {
            request.log.error(err);
            return reply.redirect("/?error=google_oauth_error");
        }
    });
};
