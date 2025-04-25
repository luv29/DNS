import * as dgram from "dgram";
import logger from "./logger/winston.logger";
import DNSHeader from "./dns/header";
import { 
    PRIMARY_DNS_SERVER, 
    SECONDARY_DNS_SERVER, 
    UPSTREAM_DNS_PORT 
} from "./constants";

export function setupForwarder(mainSocket: dgram.Socket, pendingRequests: Map<any, any>) {
    const forwardSocket: dgram.Socket = dgram.createSocket("udp4");

    forwardSocket.on("message", (data: Buffer, remoteInfo) => {
        try {
            const header = DNSHeader.parse(data.subarray(0, 12));
            const id = header.ID;
            
            const clientInfo = pendingRequests.get(id);
            if (clientInfo) {
                mainSocket.send(data, clientInfo.port, clientInfo.address);
                logger.info(`Forwarded DNS response from ${remoteInfo.address} to ${clientInfo.address}:${clientInfo.port}`);
                
                pendingRequests.delete(id);
            }
        } catch (e) {
            logger.error(`Error handling upstream DNS response: ${(e as Error).message}`);
        }
    });

    forwardSocket.on("error", (err) => {
        logger.error(`Forward socket error: ${err.message}`);
    });

    // Bind the forward socket to receive responses
    forwardSocket.bind(0, "0.0.0.0", () => {
        logger.info(`Forward socket bound to port ${forwardSocket.address().port}`);
    });

    const forwardRequest = (data: Buffer, server: string) => {
        forwardSocket.send(data, UPSTREAM_DNS_PORT, server);
    };

    process.on("exit", () => {
        forwardSocket.close();
        logger.info("DNS forwarder has been shut down");
    });

    return {
        socket: forwardSocket,
        forwardRequest
    };
}

export function forwardToPrimary(forwardSocket: dgram.Socket, data: Buffer) {
    forwardSocket.send(data, UPSTREAM_DNS_PORT, PRIMARY_DNS_SERVER);
    logger.info(`Forwarding request to primary DNS ${PRIMARY_DNS_SERVER}`);
}

export function forwardToSecondary(forwardSocket: dgram.Socket, data: Buffer) {
    forwardSocket.send(data, UPSTREAM_DNS_PORT, SECONDARY_DNS_SERVER);
    logger.info(`Forwarding request to secondary DNS ${SECONDARY_DNS_SERVER}`);
}