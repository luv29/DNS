import * as dgram from "dgram";

const client = dgram.createSocket("udp4");

const query = Buffer.from([
    0xab, 0xcd, // ID
    0x01, 0x00, // Standard query
    0x00, 0x01, // QDCOUNT (1)
    0x00, 0x00, // ANCOUNT
    0x00, 0x00, // NSCOUNT
    0x00, 0x00, // ARCOUNT

    // QNAME: codecrafters.io
    0x0b, 0x63, 0x6f, 0x64, 0x65, 0x63, 0x72, 0x61, 0x66, 0x74, 0x65, 0x72, 0x73,
    0x02, 0x69, 0x6f, 0x00,

    // QTYPE: A
    0x00, 0x01,
    // QCLASS: IN
    0x00, 0x01
]);

client.send(query, 2053, "127.0.0.1", (err) => {
    if (err) throw err;
    console.log("Sent query");

    client.on("message", (msg) => {
        console.log("Received response:");
        console.log(msg);
        console.log(msg.toString());
        console.log(msg.toJSON());
        client.close();
    });
});
