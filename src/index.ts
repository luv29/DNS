import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});

import * as dgram from "dgram";
import type { IDNSHeader, IDNSQuestion, IDNSAnswer } from "./interface";
import { OpCode, ResposeCode, DNSClass, DNSType } from "./enum";
import DNSHeader from "./dns/header";
import DNSQuestion from "./dns/question";
import DNSAnswer from "./dns/answer";
import connectDB from "./db";
import logger from "./logger/winston.logger";
import DNSRecord from "./model/DNSRecord.model"; // << make sure this path is correct

(async function () {
    await connectDB();
})();

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

logger.info("DNS Server is running on 127.0.0.1:53");

udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        logger.info(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

        const headerData = DNSHeader.parse(data.subarray(0, 12));
        const questionSection = data.subarray(12);
        const questionData = DNSQuestion.parse(questionSection);

        // Look for matching record in the DB
        const records = await DNSRecord.find({
            name: questionData.name,
            type: questionData.type,
            class: questionData.class
        });

        if (!records.length) {
            logger.warn(`No record found for ${questionData.name}`);
            // Optionally send back a response with RCode = NXDOMAIN
            return;
        }

        const answers: IDNSAnswer[] = records.map((record) => ({
            name: record.name,
            type: record.type,
            class: record.class,
            TTL: record.ttl,
            length: 4, // assuming 4 for A records. You can calculate it based on type
            data: record.data
        }));

        const responseHeader: IDNSHeader = {
            ...headerData,
            QR: 1,
            RA: 1,
            RCode: ResposeCode.NO_ERROR,
            ANCOUNT: answers.length
        };

        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = DNSQuestion.write([questionData]);
        const answerBuffer = DNSAnswer.write(answers);

        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        logger.error(`Error while handling DNS message: ${(e as Error).message}`);
    }
});
