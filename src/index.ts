import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});

import * as dgram from "dgram";
import type { 
    IDNSHeader,
    IDNSQuestion,
    IDNSAnswer
} from "./interface";
import { 
    OpCode,
    ResposeCode,
    DNSClass,
    DNSType
} from "./enum";
import DNSHeader from "./dns/header";
import DNSQuestion from "./dns/question";
import DNSAnswer from "./dns/answer";
import connectDB from "./db";
import logger from "./logger/winston.logger";

(async function () {
    await connectDB();
}) ();

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

logger.info("DNS Server is running on 127.0.0.1:53");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        logger.info(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

        // Parse the DNS header
        const headerData = DNSHeader.parse(data.subarray(0, 12));

        // Parse the DNS question
        const questionSection = data.subarray(12);
        const questionData = DNSQuestion.parse(questionSection);
        
        if (questionData.type !== DNSType.A) {
            logger.error(`Unsupported query type: ${questionData.type}`);
            // optionally respond with RCode = NOT_IMPLEMENTED
            return;
        }

        const defaultAnswer: IDNSAnswer = {
            name: questionData.name,
            type: questionData.type,
            class: questionData.class,
            TTL: 60,
            length: 4,
            data: "8.8.8.8"
        };

        const responseHeader: IDNSHeader = {
            ...headerData,
            QR: 1,
            RA: 1,
            RCode: ResposeCode.NO_ERROR,
            ANCOUNT: 1
        };

        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = DNSQuestion.write([questionData]);
        const answerBuffer = DNSAnswer.write([defaultAnswer]);

        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        logger.error(`Error while handling DNS message: ${(e as Error).message}`);
    }
});
