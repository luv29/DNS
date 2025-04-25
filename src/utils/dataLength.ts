import { DNSType } from "../enum";

export function determineDataLength(type: number, data: string): number {
    switch (type) {
        case DNSType.A:
            return 4; // IPv4 address is 4 bytes
        case DNSType.AAAA:
            return 16; // IPv6 address is 16 bytes
        case DNSType.NS:
        case DNSType.CNAME:
        case DNSType.PTR:
            return data.length + 2; // Domain name format with compression
        case DNSType.MX:
            return data.length + 4; // 2 bytes for preference + domain name
        case DNSType.TXT:
            return data.length + 1; // String length byte + string
        case DNSType.SRV:
            return data.length + 8; // 2 bytes each for priority, weight, port + domain name
        default:
            return data.length;
    }
}