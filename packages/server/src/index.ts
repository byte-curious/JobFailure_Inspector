import Fastify from "fastify"
import { failureRoute } from "./routes/failures.js";
import { inspectorRoutes } from "./routes/inspector.js";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";


// now making fastify serve for both API as well as react dashboard
// resolve cors error by serving statically
// serve the compiled packages/web/dist folder with SPA fallback
// SPA : Single Page Application - React

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
    logger: true
});

fastify.register(failureRoute);
fastify.register(inspectorRoutes);

// Serve Web Dashboard static assets(if build)
const webDistPath = path.resolve(__dirname, "../../web/dist");

if(fs.existsSync(webDistPath)){
    fastify.register(fastifyStatic, {
        root: webDistPath,
        prefix: '/',
    });

    // SPA fallback: Any non api route return index.html
    fastify.setNotFoundHandler((request,reply)=>{
        if(request.raw.url && request.raw.url.startsWith("/v1")){
            return reply.code(404).send({
                error: "NOT_FOUND",
                message: `Route ${request.raw.method}:${request.raw.url} not found`
            })
        };
        return reply.sendFile('index.html')
    })
}
else{
    fastify.log.warn(`Web frontend not built at ${webDistPath}. Serving API only.`)
}

async function main() {
    try {
        const portNumber = Number(process.env.PORT) || 3000;
        const host = process.env.HOST || "0.0.0.0";

        await fastify.listen({
            port: portNumber,
            host: host
        })
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }

}

main();
