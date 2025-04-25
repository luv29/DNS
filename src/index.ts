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
import DNSRecord from "./model/DNSRecord.model";

(async function () {
    await connectDB();
})();

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

logger.info("DNS Server is running on 127.0.0.1:53");

udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        logger.info(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

        const inputHeader = DNSHeader.parse(data.subarray(0, 12));
        let offset = 12;
        const questions: IDNSQuestion[] = [];

        for (let i = 0; i < inputHeader.QDCOUNT; i++) {
            const { question, length } = DNSQuestion.parse(data.subarray(offset));
            questions.push(question);
            offset += length;
        }

        const answers: IDNSAnswer[] = [];

        for (const question of questions) {
            const records = await DNSRecord.find({
                name: question.name,
                type: question.type,
                class: question.class,
            });

            if (!records.length) {
                logger.warn(`No record found for ${question.name} of type ${DNSType[question.type]} and class ${DNSClass[question.class]}`);
                continue; // Skip to next question if no answer
            }

            records.forEach((record) => {
                answers.push({
                    name: record.name,
                    type: record.type,
                    class: record.class,
                    TTL: record.ttl,
                    length: 4, // Adjust if type varies
                    data: record.data,
                });
            });
        }

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
        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        logger.error(`Error while handling DNS message: ${(e as Error).message}`);
    }
});
