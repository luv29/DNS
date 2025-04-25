import { OpCode, ResposeCode } from "../enum";
import type { Bit } from "./Bit";

export interface IDNSHeader {
    ID: number;
    QR: Bit;
    OpCode: OpCode;
    AA: Bit;
    TC: Bit;
    RD: Bit;
    RA: Bit;
    Z: number;
    RCode: ResposeCode;
    QDCOUNT: number;
    ANCOUNT: number;
    NSCOUNT: number;
    ARCOUNT: number;
}
