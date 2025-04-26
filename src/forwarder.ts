import * as dgram from "dgram";
import logger from "./logger/winston.logger";
import DNSHeader from "./dns/header";
import DNSAnswer from "./dns/answer";
import { 
    PRIMARY_DNS_SERVER, 
    SECONDARY_DNS_SERVER, 
    UPSTREAM_DNS_PORT 
} from "./constants";

const forwardAnswerCache = new Map<number, {
    localAnswers: any[],
    allQuestions: any[],
    remoteAddr: dgram.RemoteInfo
}>();

export function setupForwarder(mainSocket: dgram.Socket, pendingRequests: Map<any, any>) {
    const forwardSocket: dgram.Socket = dgram.createSocket("udp4");

    forwardSocket.on("message", (data: Buffer, remoteInfo) => {
        try {
            const header = DNSHeader.parse(data.subarray(0, 12));
            const id = header.ID;
            
            const clientInfo = pendingRequests.get(id);
            if (clientInfo) {
                const cacheEntry = forwardAnswerCache.get(id);
                if (cacheEntry && cacheEntry.localAnswers.length > 0) {
                    try {
                        let forwardOffset = 12;
                        
                        for (let i = 0; i < header.QDCOUNT; i++) {
                            let nameEnd = forwardOffset;
                            while (data[nameEnd] !== 0) {
                                if ((data[nameEnd] & 0xc0) === 0xc0) {
                                    nameEnd += 2;
                                    break;
                                }
                                nameEnd += 1 + data[nameEnd];
                            }
                            nameEnd += 5; 
                            forwardOffset = nameEnd;
                        }
                        
                        const responseHeader = {
                            ...header,
                            QDCOUNT: cacheEntry.allQuestions.length, // All original questions
                            ANCOUNT: cacheEntry.localAnswers.length + header.ANCOUNT
                        };
                        
                        const headerBuffer = DNSHeader.write(responseHeader);
                        
                        const questionBuffer = Buffer.from(clientInfo.questionBuffer);
                        
                        const localAnswerBuffer = DNSAnswer.write(cacheEntry.localAnswers);
                        
                        const remoteDataBuffer = data.subarray(forwardOffset);
                        
                        const response = Buffer.concat([
                            headerBuffer,
                            questionBuffer,
                            localAnswerBuffer,
                            remoteDataBuffer
                        ]);
                        
                        mainSocket.send(response, clientInfo.port, clientInfo.address);
                        logger.info(`Forwarded merged DNS response to ${clientInfo.address}:${clientInfo.port}`);
                        
                        pendingRequests.delete(id);
                        forwardAnswerCache.delete(id);
                        return;
                    } catch (mergeErr) {
                        logger.error(`Error merging DNS responses: ${(mergeErr as Error).message}`);
                    }
                }
                
                mainSocket.send(data, clientInfo.port, clientInfo.address);
                logger.info(`Forwarded DNS response from ${remoteInfo.address} to ${clientInfo.address}:${clientInfo.port}`);
                
                pendingRequests.delete(id);
                if (forwardAnswerCache.has(id)) {
                    forwardAnswerCache.delete(id);
                }
            }
        } catch (e) {
            logger.error(`Error handling upstream DNS response: ${(e as Error).message}`);
        }
    });

    forwardSocket.on("error", (err) => {
        logger.error(`Forward socket error: ${err.message}`);
    });

    forwardSocket.bind(0, "0.0.0.0", () => {
        logger.info(`Forward socket bound to port ${forwardSocket.address().port}`);
    });

    const forwardRequest = (data: Buffer, server: string, localAnswers: any[] = [], allQuestions: any[] = [], remoteAddr: dgram.RemoteInfo | null = null) => {
        try {
            const header = DNSHeader.parse(data.subarray(0, 12));
            const id = header.ID;

            if (localAnswers.length > 0 && remoteAddr) {
                forwardAnswerCache.set(id, {
                    localAnswers,
                    allQuestions,
                    remoteAddr
                });
                
                if (pendingRequests.has(id)) {
                    const questionBuffer = data.subarray(12, data.length);
                    pendingRequests.get(id).questionBuffer = questionBuffer;
                }
            }
            
            forwardSocket.send(data, UPSTREAM_DNS_PORT, server);
            logger.info(`Forwarding request ID ${id} to ${server}`);
        } catch (e) {
            logger.error(`Error in forwardRequest: ${(e as Error).message}`);
        }
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

export function forwardToPrimary(forwardSocket: dgram.Socket, data: Buffer, localAnswers: any[] = [], allQuestions: any[] = [], remoteAddr: dgram.RemoteInfo) {
    const forwardData = {
        localAnswers,
        allQuestions,
        remoteAddr
    };
    
    if (localAnswers.length > 0) {
        try {
            const header = DNSHeader.parse(data.subarray(0, 12));
            forwardAnswerCache.set(header.ID, forwardData);
        } catch (e) {
            logger.error(`Error in forwardToPrimary: ${(e as Error).message}`);
        }
    }
    
    forwardSocket.send(data, UPSTREAM_DNS_PORT, PRIMARY_DNS_SERVER);
    logger.info(`Forwarding request to primary DNS ${PRIMARY_DNS_SERVER}`);
}

export function forwardToSecondary(forwardSocket: dgram.Socket, data: Buffer, localAnswers: any[] = [], allQuestions: any[] = [], remoteAddr: dgram.RemoteInfo) {
    const forwardData = {
        localAnswers,
        allQuestions,
        remoteAddr
    };
    
    if (localAnswers.length > 0) {
        try {
            const header = DNSHeader.parse(data.subarray(0, 12));
            forwardAnswerCache.set(header.ID, forwardData);
        } catch (e) {
            logger.error(`Error in forwardToSecondary: ${(e as Error).message}`);
        }
    }
    
    forwardSocket.send(data, UPSTREAM_DNS_PORT, SECONDARY_DNS_SERVER);
    logger.info(`Forwarding request to secondary DNS ${SECONDARY_DNS_SERVER}`);
}

export function sendPartialResponse(
    socket: dgram.Socket,
    header: any,
    questions: any[],
    answers: any[],
    remoteAddr: dgram.RemoteInfo
) {
    try {
        const responseHeader = {
            ...header,
            QR: 1,
            RA: 1,
            RCode: 0, // No error
            ANCOUNT: answers.length
        };
        
        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = Buffer.alloc(0); // This will be filled by the caller
        const answerBuffer = DNSAnswer.write(answers);
        
        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
        socket.send(response, remoteAddr.port, remoteAddr.address);
        logger.info(`Sent partial DNS response with ${answers.length} local answers to ${remoteAddr.address}:${remoteAddr.port}`);
    } catch (e) {
        logger.error(`Error sending partial response: ${(e as Error).message}`);
    }
}