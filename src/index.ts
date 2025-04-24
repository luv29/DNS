import * as dgram from "dgram";
import DNSHeader, { Opcode, ResposeCode } from "./dns/header";
import type { IDNSHeader, Bit } from "./dns/header";
import DNSQuestion, { DNSClass, DNSType, type IDNSQuestion } from "./dns/question";
import DNSAnswer, { IDNSAnswer } from "./dns/answer";

console.log("Logs from your program will appear here!");

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(53, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

        const headerData = DNSHeader.parse(data)
        const questionData = DNSQuestion.parse(data.subarray(12))

        const defaultAnswer: IDNSAnswer = {
            name: questionData.name,
            type: questionData.type,
            class: questionData.class,
            TTL: 60,
            length: 4,
            data: "8.8.8.8"
        };
        
        const header = DNSHeader.write(headerData)
        const question = DNSQuestion.write([questionData])
        const answer = DNSAnswer.write([defaultAnswer])

        const response = Buffer.concat([header, question, answer]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        console.log(`Error sending data: ${e}`);
    }
});
