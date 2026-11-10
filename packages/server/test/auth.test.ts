import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { prisma } from "../src/database/db.js";
import { authRoutes } from "../src/routes/auth.js";

describe("Multi-Tenant Authentication & API Keys", () => {
    const testEmail = "developer@testcompany.com";
    const testPassword = "SuperSecurePassword123!";

    const server = Fastify();

    before(async () => {
        server.register(fastifyJwt, { secret: "test-secret" });
        server.register(authRoutes);
        await server.ready();

        // Clean up test data
        await prisma.user.deleteMany({ where: { email: testEmail } });
    });

    after(async () => {
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await server.close();
    });

    it("should sign up a new user and generate a default project with an API key", async () => {
        const res = await server.inject({
            method: "POST",
            url: "/v1/auth/signup",
            payload: {
                email: testEmail,
                password: testPassword,
                name: "Test Developer",
                projectName: "Acme Production",
            },
        });

        assert.equal(res.statusCode, 201);
        const body = res.json();
        assert.ok(body.token, "Must return signed JWT");
        assert.equal(body.user.email, testEmail);
        assert.ok(body.project.apiKey.startsWith("insp_live_"), "Must generate insp_live_ API key");
    });

    it("should reject signup if email is already registered", async () => {
        const res = await server.inject({
            method: "POST",
            url: "/v1/auth/signup",
            payload: { email: testEmail, password: testPassword },
        });

        assert.equal(res.statusCode, 409);
    });

    it("should log in with valid credentials and return projects list", async () => {
        const res = await server.inject({
            method: "POST",
            url: "/v1/auth/login",
            payload: { email: testEmail, password: testPassword },
        });

        assert.equal(res.statusCode, 200);
        const body = res.json();
        assert.ok(body.token);
        assert.equal(body.projects.length >= 1, true);
    });

    it("should reject login with wrong password", async () => {
        const res = await server.inject({
            method: "POST",
            url: "/v1/auth/login",
            payload: { email: testEmail, password: "wrongPassword!" },
        });

        assert.equal(res.statusCode, 401);
    });
});
