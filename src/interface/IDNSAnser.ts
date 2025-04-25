import { DNSClass, DNSType } from "../enum";

export interface IDNSAnswer {
    name: string;
    type: DNSType;
    class: DNSClass;
    TTL: number;
    length: number;
    data: string;
}