import { OpCode, ResposeCode } from "../enum";
import type { Bit, IDNSHeader } from "../interface";

class DNSHeader {
    static write(header: IDNSHeader): Buffer {
        const headerBuffer = Buffer.alloc(12);
        
        headerBuffer.writeUInt16BE(header.ID)
        
        headerBuffer.writeUInt8(Number(`0b${header.QR}${header.OpCode}${header.AA}${header.TC}${header.RD}`), 2)
        headerBuffer.writeUInt8(Number(`0b${header.RA}${header.Z}${header.RCode}`), 3)
        
        headerBuffer.writeUInt16BE(header.QDCOUNT, 4)
        headerBuffer.writeUInt16BE(header.ANCOUNT, 6)
        headerBuffer.writeUInt16BE(header.NSCOUNT, 8)
        headerBuffer.writeUInt16BE(header.ARCOUNT, 10)
        
        return headerBuffer;
    }

    static parse(data: Buffer): IDNSHeader {
        const id =  data.readUInt16BE(0);
        const thirdByte = data.readUInt8(2).toString(2).padStart(8, '0')
        const opCode  = thirdByte.slice(1, 5)
        const rd = parseInt(thirdByte[thirdByte.length-1]) as Bit
        const rCode = (opCode) === '0000' ? opCode : '0100'
        
        const header: IDNSHeader = {
            ID: id,
            QR: 1,
            OpCode: opCode as OpCode,
            AA: 0,
            TC: 0,
            RD: rd,
            RA: 0,
            Z: "000",
            RCode: rCode as ResposeCode,
            QDCOUNT: 1,
            ANCOUNT: 1,
            NSCOUNT: 0,
            ARCOUNT: 0,
        };

        return header;
    }
}

export default DNSHeader;