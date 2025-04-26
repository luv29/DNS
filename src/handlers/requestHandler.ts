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
        
        const questionStartOffset = offset;

        for (let i = 0; i < inputHeader.QDCOUNT; i++) {
            const { question, length } = DNSQuestion.parse(data.subarray(offset));
            questions.push(question);
            offset += length;
        }
        
        const questionBuffer = data.subarray(questionStartOffset, offset);

        questions.forEach(q => {
            logger.info(`Query for: ${q.name}, type: ${DNSType[q.type] || q.type}, class: ${DNSClass[q.class] || q.class}`);
        });

        const answers: IDNSAnswer[] = [];
        const questionsToForward: IDNSQuestion[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const records = await DNSRecord.find({
                name: question.name,
                type: question.type,
                class: question.class,
            });

            if (!records.length) {
                logger.info(`No local record found for ${question.name}, will forward this question to upstream DNS`);
                questionsToForward.push(question);
            } else {
                logger.info(`Found ${records.length} local records for ${question.name}`);
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
        }

        if (questionsToForward.length > 0) {
            if (questionsToForward.length < questions.length) {
                logger.info(`Forwarding ${questionsToForward.length} out of ${questions.length} questions`);
                
                const forwardHeader: IDNSHeader = {
                    ...inputHeader,
                    QDCOUNT: questionsToForward.length,
                };
                
                const headerBuffer = DNSHeader.write(forwardHeader);
                const forwardQuestionBuffer = DNSQuestion.write(questionsToForward);
                const forwardData = Buffer.concat([headerBuffer, forwardQuestionBuffer]);
                
                const pendingRequests = new Map();
                const { socket: forwardSocket, forwardRequest } = setupForwarder(socket, pendingRequests);
                
                pendingRequests.set(inputHeader.ID, {
                    address: remoteAddr.address,
                    port: remoteAddr.port,
                    timestamp: Date.now(),
                    tries: 0,
                    primaryServer: true,
                    questionBuffer: questionBuffer // Store the original question buffer
                });
                
                setTimeout(() => {
                    const request = pendingRequests.get(inputHeader.ID);
                    if (request && request.tries === 0) {
                        request.primaryServer = false;
                        request.tries++;
                        
                        logger.info(`Retrying request ${inputHeader.ID} with secondary DNS server`);
                        forwardRequest(forwardData, "1.1.1.1", answers, questions, remoteAddr);
                        
                        setTimeout(() => {
                            if (pendingRequests.has(inputHeader.ID)) {
                                logger.warn(`Request ${inputHeader.ID} timed out after retry, cleaning up`);
                                
                                if (answers.length > 0) {
                                    logger.info(`Sending partial response with ${answers.length} local answers`);
                                    
                                    const partialHeader: IDNSHeader = {
                                        ...inputHeader,
                                        QR: 1,
                                        RA: 1,
                                        RCode: ResposeCode.NO_ERROR,
                                        ANCOUNT: answers.length,
                                    };
                                    
                                    const headerBuffer = DNSHeader.write(partialHeader);
                                    const answerBuffer = DNSAnswer.write(answers);
                                    
                                    const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
                                    socket.send(response, remoteAddr.port, remoteAddr.address);
                                } else {
                                    sendErrorResponse(socket, inputHeader, questions, remoteAddr);
                                }
                                
                                pendingRequests.delete(inputHeader.ID);
                            }
                        }, RETRY_TIMEOUT);
                    }
                }, RETRY_TIMEOUT);
                
                forwardRequest(forwardData, "8.8.8.8", answers, questions, remoteAddr);
                logger.info(`Forwarding ${questionsToForward.length} questions to primary DNS server`);
            } else {
                const pendingRequests = new Map();
                const { socket: forwardSocket, forwardRequest } = setupForwarder(socket, pendingRequests);
                
                pendingRequests.set(inputHeader.ID, {
                    address: remoteAddr.address,
                    port: remoteAddr.port,
                    timestamp: Date.now(),
                    tries: 0,
                    primaryServer: true
                });
                
                setTimeout(() => {
                    const request = pendingRequests.get(inputHeader.ID);
                    if (request && request.tries === 0) {
                        request.primaryServer = false;
                        request.tries++;
                        
                        logger.info(`Retrying request ${inputHeader.ID} with secondary DNS server`);
                        forwardRequest(data, "1.1.1.1");
                        
                        setTimeout(() => {
                            if (pendingRequests.has(inputHeader.ID)) {
                                logger.warn(`Request ${inputHeader.ID} timed out after retry, cleaning up`);
                                sendErrorResponse(socket, inputHeader, questions, remoteAddr);
                                pendingRequests.delete(inputHeader.ID);
                            }
                        }, RETRY_TIMEOUT);
                    }
                }, RETRY_TIMEOUT);
                
                forwardRequest(data, "8.8.8.8");
                logger.info(`Forwarding request to primary DNS server`);
            }
        } else {
            const responseHeader: IDNSHeader = {
                ...inputHeader,
                QR: 1,
                RA: 1,
                RCode: ResposeCode.NO_ERROR,
                ANCOUNT: answers.length,
            };

            const headerBuffer = DNSHeader.write(responseHeader);
            const answerBuffer = DNSAnswer.write(answers);

            const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
            socket.send(response, remoteAddr.port, remoteAddr.address);
            logger.info(`Sent complete DNS response to ${remoteAddr.address}:${remoteAddr.port}`);
        }
    } catch (e) {
        logger.error(`Error while handling DNS message: ${(e as Error).message}`);
        
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