import * as dgram from "dgram";
import DNSHeader, { Opcode, ResposeCode } from "./dns/header";
import DNSQuestion, { DNSClass, DNSType, type IDNSQuestion } from "./dns/question";

const socket = dgram.createSocket("udp4");

const domain = "code.io";

const header = DNSHeader.write({
    ID: Math.floor(Math.random() * 65535),
    QR: 0,
    OpCode: Opcode.STANDARD_QUERY,
    AA: 0,
    TC: 0,
    RD: 1,
    RA: 0,
    Z: "000",
    RCode: ResposeCode.NOT_IMPLEMENTED,
    QDCOUNT: 1,
    ANCOUNT: 0,
    NSCOUNT: 0,
    ARCOUNT: 0,
});

const question: IDNSQuestion = {
    name: domain,
    type: DNSType.A,
    class: DNSClass.IN,
};

const questionBuffer = DNSQuestion.write([question]);

const message = Buffer.concat([header, questionBuffer]);

socket.send(message, 53, "127.0.0.1");

socket.on("message", (msg: Buffer) => {
    const header = DNSHeader.parse(msg.subarray(0, 12));
    console.log("\n--- DNS HEADER ---");
    console.log(header);

    // Parse question
    const { question, length: questionLen } = DNSQuestion.parseWithLength(msg.subarray(12));
    console.log("\n--- DNS QUESTION ---");
    console.log(question);

    let offset = 12 + questionLen;

    // Parse answer name (should be a pointer)
    const nameByte = msg.readUInt8(offset);
    let name = "";
    if ((nameByte & 0b11000000) === 0b11000000) {
        const pointer = msg.readUInt16BE(offset) & 0x3FFF;
        const { name: parsedName } = DNSQuestion.parseWithLength(msg.subarray(pointer));
        name = parsedName!;
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

    const ip = dataBytes.join(".");

    console.log("\n--- DNS ANSWER ---");
    console.log(`Name: ${name}`);
    console.log(`Type: ${type}`);
    console.log(`Class: ${classCode}`);
    console.log(`TTL: ${ttl}`);
    console.log(`Data: ${ip}`);

    socket.close();
});
