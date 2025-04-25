import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});

import { startServer } from "./server";
import connectDB from "./db";
import logger from "./logger/winston.logger";

async function main() {
    try {
        await connectDB();
        
        startServer();
        
        logger.info("DNS Server has been initialized successfully");
    } catch (error) {
        logger.error(`Failed to start DNS server: ${(error as Error).message}`);
        process.exit(1);
    }
}

main();