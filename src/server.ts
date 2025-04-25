import * as dgram from "dgram";
import logger from "./logger/winston.logger";
import { SERVER_HOST, SERVER_PORT } from "./constants";
import { setupForwarder } from "./forwarder";
import { handleDnsRequest } from "./handlers/requestHandler";
import { setupCleanupTask } from "./utils/cleanup";

const udpSocket: dgram.Socket = dgram.createSocket("udp4");

export const pendingRequests = new Map();

export function startServer() {
    udpSocket.bind(SERVER_PORT, SERVER_HOST);

    udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
        await handleDnsRequest(udpSocket, data, remoteAddr);
    });

    udpSocket.on("error", (err) => {
        logger.error(`DNS server error: ${err.message}`);
    });

    udpSocket.on("listening", () => {
        const address = udpSocket.address();
        logger.info(`DNS Server is running on ${address.address}:${address.port}`);
    });

    setupForwarder(udpSocket, pendingRequests);

    setupCleanupTask(pendingRequests);

    process.on("exit", () => {
        udpSocket.close();
        logger.info("DNS server has been shut down");
    });

    return udpSocket;
}

export function getSocket() {
    return udpSocket;
}