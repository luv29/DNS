import { OpCode, ResposeCode } from "../enum";
import type { Bit, IDNSHeader } from "../interface";

class DNSHeader {
    static write(header: IDNSHeader): Buffer {
        const headerBuffer = Buffer.alloc(12);
    
        headerBuffer.writeUInt16BE(header.ID, 0);
    
        // Construct the third byte (flags1)
        const flags1 =
            (header.QR << 7) |
            (header.OpCode << 3) |
            (header.AA << 2) |
            (header.TC << 1) |
            header.RD;
        headerBuffer.writeUInt8(flags1, 2);
    
        // Construct the fourth byte (flags2)
        const flags2 =
            (header.RA << 7) |
            ((header.Z & 0x7) << 4) |
            (header.RCode & 0x0F);
        headerBuffer.writeUInt8(flags2, 3);
    
        headerBuffer.writeUInt16BE(header.QDCOUNT, 4);
        headerBuffer.writeUInt16BE(header.ANCOUNT, 6);
        headerBuffer.writeUInt16BE(header.NSCOUNT, 8);
        headerBuffer.writeUInt16BE(header.ARCOUNT, 10);
    
        return headerBuffer;
    }

    static parse(buffer: Buffer): IDNSHeader {
        const header: IDNSHeader = {
            ID: buffer.readUInt16BE(0),
            QR: ((buffer[2] >> 7) & 1) as Bit,
            OpCode: (buffer[2] >> 3) & 0x0f,
            AA: ((buffer[2] >> 2) & 1) as Bit,
            TC: ((buffer[2] >> 1) & 1) as Bit,
            RD: (buffer[2] & 1) as Bit,
            RA: ((buffer[3] >> 7) & 1) as Bit,
            Z: (buffer[3] >> 4) & 7,
            RCode: buffer[3] & 0x0f,
            // QR: 1,
            // OpCode: opCode as OpCode,
            // AA: 0,
            // TC: 0,
            // RD: rd,
            // RA: 0,
            // Z: "000",
            // RCode: rCode as ResposeCode,
            QDCOUNT: buffer.readUInt16BE(4),
            ANCOUNT: buffer.readUInt16BE(6),
            NSCOUNT: buffer.readUInt16BE(8),
            ARCOUNT: buffer.readUInt16BE(10),
        };

        return header;
    }
}

export default DNSHeader;