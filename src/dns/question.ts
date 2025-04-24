export enum DNSType {
    A = 1,
    NS = 2,
    MD = 3,
    MF = 4,
    CNAME = 5,
    SOA = 6,
    MB = 7,
    MG = 8,
    MR = 9,
    NULL = 10,
    WKS = 11,
    PTR = 12,
    HINFO = 13,
    MINFO = 14,
    MX = 15,
    TXT = 16
}

export enum DNSClass {
    IN = 1,
    CS = 2,
    CH = 3,
    HS = 4
}

export interface IDNSQuestion {
    name: string;
    type: DNSType;
    classCode: DNSClass;
}

class DNSQuestion {
    static write(questions: IDNSQuestion[]) {
        return Buffer.concat(questions.map(question => {
            const { name, type, classCode } = question;

            const str = name
                .split(".")
                .map((n) => `${String.fromCharCode(n.length)}${n}`)
                .join("");

            const typeAndClass = Buffer.alloc(4)
            typeAndClass.writeUInt16BE(type);
            typeAndClass.writeUInt16BE(classCode, 2);

            return Buffer.concat([Buffer.from(str + '\0', 'binary'), typeAndClass])
        }));
    }
}

export default DNSQuestion;