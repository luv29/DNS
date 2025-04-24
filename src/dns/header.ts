export enum OpCode {
    STANDARD_QUERY = 0,
    INVERSE_QUERY = 1,
    SERVER_STATUS_REQUEST = 2
}

export enum ResposeCode {
    NO_ERROR = 0,
    FORMAT_ERROR = 1,
    SERVER_FAILURE = 2,
    NAME_ERROR = 3,
    NOT_IMPLEMENTED = 4,
    REFUSED = 5,
}

export interface IDNSHeader {
    id: number;
    qr: number;
    opcode: OpCode;
    aa: number;
    tc: number;
    rd: number;
    ra: number;
    z: number;
    rcode: ResposeCode;
    qdcount: number;
    ancount: number;
    nscount: number;
    arcount: number;
}

class DNSHeader {
    static write(values: IDNSHeader) {
        const header = Buffer.alloc(12);

        const flags =
            (values.qr << 15) |
            (values.opcode << 11) |
            (values.aa << 10) |
            (values.tc << 9) |
            (values.rd << 8) |
            (values.ra << 7) |
            (values.z << 4) |
            (values.rcode << 0);

        header.writeUInt16BE(values.id, 0);
        header.writeUInt16BE(flags, 2);
        header.writeUInt16BE(values.qdcount, 4);
        header.writeUInt16BE(values.ancount, 6);
        header.writeUInt16BE(values.nscount, 8);
        header.writeUInt16BE(values.arcount, 10);

        return header;
    }
}

export default DNSHeader;