import * as dgram from "dgram";
import type { IDNSQuestion } from "./interface";
import { ResposeCode, DNSClass, DNSType, OpCode } from "./enum";
import DNSHeader from "./dns/header";
import DNSQuestion from "./dns/question";

const socket = dgram.createSocket("udp4");

const questions: IDNSQuestion[] = [
    {
        name: "code.io",
        type: DNSType.A,
        class: DNSClass.IN,
    },
    {
        name: "example.com",
        type: DNSType.A,
        class: DNSClass.IN,
    },
];

const header = DNSHeader.write({
    ID: Math.floor(Math.random() * 65535),
    QR: 0,
    OpCode: OpCode.STANDARD_QUERY,
    AA: 0,
    TC: 0,
    RD: 1,
    RA: 0,
    Z: 0,
    RCode: ResposeCode.NO_ERROR,
    QDCOUNT: questions.length,
    ANCOUNT: 0,
    NSCOUNT: 0,
    ARCOUNT: 0,
});

const questionBuffer = DNSQuestion.write(questions);
const message = Buffer.concat([header, questionBuffer]);

socket.send(message, 53, "127.0.0.1");

socket.on("message", (msg: Buffer) => {
    const header = DNSHeader.parse(msg.subarray(0, 12));
    console.log("\n--- DNS HEADER ---");
    console.log(header);

    let offset = 12;
    const parsedQuestions = [];
    for (let i = 0; i < header.QDCOUNT; i++) {
        const { question, length } = DNSQuestion.parse(msg.subarray(offset));
        parsedQuestions.push(question);
        offset += length;
    }

    console.log("\n--- DNS QUESTIONS ---");
    console.log(parsedQuestions);

    console.log("\n--- DNS ANSWERS ---");
    for (let i = 0; i < header.ANCOUNT; i++) {
        // name (possibly compressed)
        const nameByte = msg.readUInt8(offset);
        let name = "";
        if ((nameByte & 0b11000000) === 0b11000000) {
            const pointer = msg.readUInt16BE(offset) & 0x3FFF;
            const { question: qName } = DNSQuestion.parse(msg.subarray(pointer));
            name = qName.name;
            offset += 2;
        } else {
            const labels = [];
            while (msg[offset] !== 0) {
                const len = msg.readUInt8(offset++);
                labels.push(msg.subarray(offset, offset + len).toString());
                offset += len;
            }
            offset++; // null byte
            name = labels.join(".");
        }

        const type = msg.readUInt16BE(offset); offset += 2;
        const classCode = msg.readUInt16BE(offset); offset += 2;
        const ttl = msg.readUInt32BE(offset); offset += 4;
        const dataLen = msg.readUInt16BE(offset); offset += 2;
        const dataBytes = msg.subarray(offset, offset + dataLen);
        offset += dataLen;

        const ip = [...dataBytes].join(".");
        console.log(`Name: ${name}`);
        console.log(`Type: ${type}`);
        console.log(`Class: ${classCode}`);
        console.log(`TTL: ${ttl}`);
        console.log(`Data: ${ip}`);
        console.log("---");
    }

    socket.close();
});
