export type Bit = 0 | 1;

export enum Opcode {
    STANDARD_QUERY = '0000',
    INVERSE_QUERY = '0001',
    SERVER_STATUS_REQUEST = '0010'
}

export enum ResposeCode {
    NO_ERROR = '0000',
    FORMAT_ERROR = '0001',
    SERVER_FAILURE = '0010',
    NAME_ERROR = '0011',
    NOT_IMPLEMENTED = '0100',
    REFUSED = '0101',
}

export interface IDNSHeader {
    ID: number;
    QR: Bit;
    OpCode: Opcode;
    AA: Bit;
    TC: Bit;
    RD: Bit;
    RA: Bit;
    Z: string;
    RCode: ResposeCode;
    QDCOUNT: number;
    ANCOUNT: number;
    NSCOUNT: number;
    ARCOUNT: number;
}

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
            OpCode: opCode as Opcode,
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