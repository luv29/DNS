import * as dgram from "dgram";
import DNSHeader, { OpCode, ResposeCode } from "./dns/header";
import type { IDNSHeader } from "./dns/header";
import DNSQuestion, { DNSClass, DNSType, type IDNSQuestion } from "./dns/question";
import DNSAnswer, { IDNSAnswer } from "./dns/answer";

const defaultHeader: IDNSHeader = {
    id: 1234,
    qr: 1,
    opcode: OpCode.STANDARD_QUERY,
    aa: 0,
    tc: 0,
    rd: 0,
    ra: 0,
    z: 0,
    rcode: ResposeCode.NO_ERROR,
    qdcount: 0,
    ancount: 0,
    nscount: 0,
    arcount: 0
}

const defaultQuestion: IDNSQuestion = {
    name: "code.io",
    classCode: DNSClass.IN,
    type: DNSType.A
}

const defaultAnswer: IDNSAnswer = {
    name: "codecrafter.io",
    type: DNSType.A,
    classNmae: DNSClass.CH,
    ttl: 60,
    data: "\x08\x08\x08\x08"
}

console.log("Logs from your program will appear here!");

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);
        
        const header = DNSHeader.write({...defaultHeader, qdcount: 1, ancount: 1})
        const question = DNSQuestion.write([defaultQuestion])
        const answer = DNSAnswer.write([defaultAnswer])

        const response = Buffer.concat([header, question, answer]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        console.log(`Error sending data: ${e}`);
    }
});
