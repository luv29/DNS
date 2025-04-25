import * as dgram from "dgram";
import logger from "../logger/winston.logger";
import DNSHeader from "../dns/header";
import DNSQuestion from "../dns/question";
import DNSAnswer from "../dns/answer";
import { OpCode, ResposeCode, DNSClass, DNSType } from "../enum";
import type { IDNSHeader, IDNSQuestion, IDNSAnswer } from "../interface";
import DNSRecord from "../model/DNSRecord.model";
import { determineDataLength } from "../utils/dataLength";
import { setupForwarder } from "../forwarder";
import { RETRY_TIMEOUT, REQUEST_TIMEOUT } from "../constants";

export async function handleDnsRequest(socket: dgram.Socket, data: Buffer, remoteAddr: dgram.RemoteInfo) {
    try {
        logger.info(`Received DNS query from ${remoteAddr.address}:${remoteAddr.port}`);

        const inputHeader = DNSHeader.parse(data.subarray(0, 12));
        let offset = 12;
        const questions: IDNSQuestion[] = [];

        for (let i = 0; i < inputHeader.QDCOUNT; i++) {
            const { question, length } = DNSQuestion.parse(data.subarray(offset));
            questions.push(question);
            offset += length;
        }

        questions.forEach(q => {
            logger.info(`Query for: ${q.name}, type: ${DNSType[q.type] || q.type}, class: ${DNSClass[q.class] || q.class}`);
        });

        let shouldForward = false;
        const answers: IDNSAnswer[] = [];

        for (const question of questions) {
            const records = await DNSRecord.find({
                name: question.name,
                type: question.type,
                class: question.class,
            });

            if (!records.length) {
                logger.info(`No local record found for ${question.name}, will forward to upstream DNS`);
                shouldForward = true;
                break; // No need to continue checking other questions if we'll forward
            }

            records.forEach((record) => {
                answers.push({
                    name: record.name,
                    type: record.type,
                    class: record.class,
                    TTL: record.ttl,
                    length: determineDataLength(record.type, record.data),
                    data: record.data,
                });
            });
        }

        if (shouldForward) {
            const { socket: forwardSocket, forwardRequest } = setupForwarder(socket, new Map());
            
            // Store client info in pendingRequests map
            const pendingRequests = new Map();
            pendingRequests.set(inputHeader.ID, {
                address: remoteAddr.address,
                port: remoteAddr.port,
                timestamp: Date.now(),
                tries: 0,
                primaryServer: true, // Start with primary DNS server
            });
            
            // Set a timeout to retry with secondary DNS if primary doesn't respond
            setTimeout(() => {
                const request = pendingRequests.get(inputHeader.ID);
                if (request && request.tries === 0) {
                    // Use the secondary server for retry
                    request.primaryServer = false;
                    request.tries++;
                    
                    logger.info(`Retrying request ${inputHeader.ID} with secondary DNS server`);
                    forwardRequest(data, request.primaryServer ? "8.8.8.8" : "1.1.1.1");
                    
                    // Set final timeout
                    setTimeout(() => {
                        if (pendingRequests.has(inputHeader.ID)) {
                            logger.warn(`Request ${inputHeader.ID} timed out after retry, cleaning up`);
                            pendingRequests.delete(inputHeader.ID);
                            
                            // Send an error response to the client
                            sendErrorResponse(socket, inputHeader, questions, remoteAddr);
                        }
                    }, RETRY_TIMEOUT);
                }
            }, RETRY_TIMEOUT);
            
            // Forward the original request to upstream DNS
            forwardRequest(data, "8.8.8.8");
            logger.info(`Forwarding request for ${questions.map(q => q.name).join(', ')} to primary DNS server`);
        } else {
            // We have all answers, respond directly
            logger.info(`Responding with local records for ${questions.map(q => q.name).join(', ')}`);
            
            const responseHeader: IDNSHeader = {
                ...inputHeader,
                QR: 1,
                RA: 1,
                RCode: ResposeCode.NO_ERROR,
                ANCOUNT: answers.length,
            };

            const headerBuffer = DNSHeader.write(responseHeader);
            const questionBuffer = DNSQuestion.write(questions);
            const answerBuffer = DNSAnswer.write(answers);

            const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
            socket.send(response, remoteAddr.port, remoteAddr.address);
            logger.info(`Sent local DNS response to ${remoteAddr.address}:${remoteAddr.port}`);
        }
    } catch (e) {
        logger.error(`Error while handling DNS message: ${(e as Error).message}`);
        
        // Try to send a server failure response
        try {
            const errorHeader: IDNSHeader = {
                ID: 0, // This will be incorrect if we can't parse the original header
                QR: 1,
                OpCode: OpCode.STANDARD_QUERY,
                AA: 0,
                TC: 0,
                RD: 1,
                RA: 1,
                Z: 0,
                RCode: ResposeCode.SERVER_FAILURE,
                QDCOUNT: 0,
                ANCOUNT: 0,
                NSCOUNT: 0,
                ARCOUNT: 0
            };
            
            // Try to parse the header to get the correct ID
            try {
                const parsedHeader = DNSHeader.parse(data.subarray(0, 12));
                errorHeader.ID = parsedHeader.ID;
            } catch (err) {
                logger.error(`Couldn't parse DNS header for error response: ${(err as Error).message}`);
            }
            
            const headerBuffer = DNSHeader.write(errorHeader);
            socket.send(headerBuffer, remoteAddr.port, remoteAddr.address);
        } catch (responseErr) {
            logger.error(`Failed to send error response: ${(responseErr as Error).message}`);
        }
    }
}

function sendErrorResponse(
    socket: dgram.Socket, 
    inputHeader: IDNSHeader, 
    questions: IDNSQuestion[], 
    remoteAddr: dgram.RemoteInfo
) {
    const errorHeader: IDNSHeader = {
        ...inputHeader,
        QR: 1,
        RA: 1,
        RCode: ResposeCode.SERVER_FAILURE,
        ANCOUNT: 0,
    };
    
    const headerBuffer = DNSHeader.write(errorHeader);
    const questionBuffer = DNSQuestion.write(questions);
    const response = Buffer.concat([headerBuffer, questionBuffer]);
    
    socket.send(response, remoteAddr.port, remoteAddr.address);
    logger.info(`Sent DNS error response to ${remoteAddr.address}:${remoteAddr.port}`);
}