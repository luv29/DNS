import * as dgram from "dgram";

const serverPort = 53;
const serverAddress = "127.0.0.1";
const domain = "code.io";

function buildQuery(): Buffer {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x1234, 0); // ID
    header.writeUInt16BE(0x0100, 2); // Flags: Standard query with recursion desired
    header.writeUInt16BE(1, 4);      // QDCOUNT
    header.writeUInt16BE(0, 6);      // ANCOUNT
    header.writeUInt16BE(0, 8);      // NSCOUNT
    header.writeUInt16BE(0, 10);     // ARCOUNT

    const questionParts = domain.split(".");
    const questionName = Buffer.concat(
        questionParts.map(part => {
            const len = Buffer.alloc(1);
            len.writeUInt8(part.length);
            return Buffer.concat([len, Buffer.from(part)]);
        }).concat(Buffer.from([0x00])) // null terminator
    );

    const questionTypeClass = Buffer.alloc(4);
    questionTypeClass.writeUInt16BE(1, 0); // Type A
    questionTypeClass.writeUInt16BE(1, 2); // Class IN

    return Buffer.concat([header, questionName, questionTypeClass]);
}

function parseResponse(msg: Buffer) {
    const id = msg.readUInt16BE(0);
    const flags = msg.readUInt16BE(2);
    const qdcount = msg.readUInt16BE(4);
    const ancount = msg.readUInt16BE(6);

    const rcode = flags & 0x000F;

    console.log(`DNS Response (ID: ${id})`);
    console.log(`RCODE: ${rcode}`);
    console.log(`Questions: ${qdcount}, Answers: ${ancount}`);

    let offset = 12;

    // Skip questions
    for (let i = 0; i < qdcount; i++) {
        while (msg[offset] !== 0) offset += msg[offset] + 1;
        offset += 5; // null byte + type (2) + class (2)
    }

    // Parse answers
    for (let i = 0; i < ancount; i++) {
        // Read name
        const nameParts = [];
        while (msg[offset] !== 0) {
            const len = msg[offset];
            offset++;
            nameParts.push(msg.toString("ascii", offset, offset + len));
            offset += len;
        }
        offset++; // null terminator

        const type = msg.readUInt16BE(offset); offset += 2;
        const cls = msg.readUInt16BE(offset); offset += 2;
        const ttl = msg.readUInt16BE(offset); offset += 2;
        const rdlength = msg.readUInt16BE(offset); offset += 2;

        const rdata = msg.slice(offset, offset + rdlength);
        offset += rdlength;

        let dataStr = rdata.toString("ascii").replace(/\0$/, "");
        if (type === 1 && rdlength === 4) {
            dataStr = [...rdata].join('.');
        }

        console.log(`Answer ${i + 1}:`);
        console.log(`Type: ${type}, TTL: ${ttl}s`);
        console.log(`Data: ${dataStr}`);
    }
}

const socket = dgram.createSocket("udp4");
const query = buildQuery();

socket.send(query, serverPort, serverAddress, err => {
    if (err) console.error("Error sending query:", err);
});

socket.on("message", msg => {
    console.log("Received response from server:");
    parseResponse(msg);
    socket.close();
});
