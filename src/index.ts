import * as dgram from "dgram";
import DNSHeader, { Opcode, ResposeCode } from "./dns/header";
import type { IDNSHeader } from "./dns/header";
import DNSQuestion, { DNSClass, DNSType, type IDNSQuestion } from "./dns/question";
import DNSAnswer, { IDNSAnswer } from "./dns/answer";

console.log("DNS Server is running on 127.0.0.1:53");

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        console.log(`\nReceived data from ${remoteAddr.address}:${remoteAddr.port}`);

        // Parse the DNS header
        const headerData = DNSHeader.parse(data.subarray(0, 12));

        // Parse the DNS question
        const questionSection = data.subarray(12);
        const questionData = DNSQuestion.parse(questionSection);

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
        console.error(`Error while handling DNS message: ${(e as Error).message}`);
    }
});
