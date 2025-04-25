import { IDNSAnswer } from "../interface";
import { DNSType } from "../enum";

class DNSAnswer {
    static write(answers: IDNSAnswer[]) {
        return Buffer.concat(
            answers.map((answer) => {
                // Encode NAME (domain name of the answer)
                const questionLabels = answer.name
                    .split(".")
                    .map(label => {
                        const length = label.length;
                        const buff = Buffer.alloc(length + 1);
                        buff.writeUInt8(length);
                        buff.write(label, 1);
                        return buff;
                    });

                const endBuffer = Buffer.from([0x00]);

                const dnsTypeBuffer = Buffer.alloc(2);
                dnsTypeBuffer.writeUInt16BE(answer.type);

                const dnsClassBuffer = Buffer.alloc(2);
                dnsClassBuffer.writeUInt16BE(answer.class);

                const ttlBuffer = Buffer.alloc(4);
                ttlBuffer.writeUInt32BE(answer.TTL);

                let rdata: Buffer;
                let rdataLength: number;

                switch (answer.type) {
                    case DNSType.A: {
                        // IPv4
                        rdata = Buffer.from(answer.data.split(".").map(octet => Number(octet)));
                        rdataLength = 4;
                        break;
                    }
                    case DNSType.AAAA: {
                        // IPv6
                        const segments = answer.data.split(":").map(seg => parseInt(seg, 16));
                        rdata = Buffer.alloc(16);
                        segments.forEach((seg, i) => rdata.writeUInt16BE(seg, i * 2));
                        rdataLength = 16;
                        break;
                    }
                    case DNSType.CNAME:
                    case DNSType.NS:
                    case DNSType.PTR: {
                        // Domain name in DNS format
                        const parts = answer.data.split(".");
                        const labelBuffers = parts.map(part => {
                            const len = Buffer.alloc(1);
                            len.writeUInt8(part.length);
                            return Buffer.concat([len, Buffer.from(part)]);
                        });
                        rdata = Buffer.concat([...labelBuffers, Buffer.from([0x00])]);
                        rdataLength = rdata.length;
                        break;
                    }
                    default: {
                        // Fallback: return empty
                        rdata = Buffer.from([]);
                        rdataLength = 0;
                        break;
                    }
                }

                const lengthBuffer = Buffer.alloc(2);
                lengthBuffer.writeUInt16BE(rdataLength);

                return Buffer.concat([
                    ...questionLabels,
                    endBuffer,
                    dnsTypeBuffer,
                    dnsClassBuffer,
                    ttlBuffer,
                    lengthBuffer,
                    rdata
                ]);
            })
        );
    }
}

export default DNSAnswer;
