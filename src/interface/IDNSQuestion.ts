import { DNSClass, DNSType } from "../enum";

export interface IDNSQuestion {
    name: string;
    type: DNSType;
    class: DNSClass;
}