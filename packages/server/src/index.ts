import Fastify from "fastify"
import { failureRoute } from "./routes/failures.js";


const fastify = Fastify({
    logger: true
});

fastify.register(failureRoute);

async function main() {
    try {
        const portNumber = Number(process.env.PORT) || 3000;
        const host = process.env.HOST || "127.0.0.1";

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
