export enum DNSQuestionType {
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
    type: DNSQuestionType;
    classCode: DNSClass;
}

class DNSQuestion {
    static write(questions: IDNSQuestion[]) {
        return Buffer.concat(questions.map(question => {
            const { name, type, classCode } = question;

            const encodedName = name
                .split(".")
                .map(part => {
                    const buf = Buffer.alloc(part.length + 1);
                    buf.writeUInt8(part.length, 0);
                    buf.write(part, 1);
                    return buf;
                });

            const nullTerminator = Buffer.from([0]);

            const typeAndClass = Buffer.alloc(4);
            typeAndClass.writeUInt16BE(type, 0);
            typeAndClass.writeUInt16BE(classCode, 2);

            return Buffer.concat([...encodedName, nullTerminator, typeAndClass]);
        }));
    }
}

export default DNSQuestion;