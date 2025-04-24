import { DNSClass, DNSType } from "./question";

export interface IDNSAnswer {
    name: string;
    type: DNSType;
    classNmae: DNSClass;
    ttl: number;
    data: string;
}

class DNSAnswer {
    static write(answer: IDNSAnswer[]) {
        return Buffer.concat(
            answer.map((ans) => {
                const {classNmae, data, name, ttl, type} = ans

                const buffer = Buffer.alloc(10)

                const str = name
                    .split('.')
                    .map(e => `${String.fromCharCode(e.length)}${e}`)
                    .join("")

                buffer.writeUInt16BE(type);
                buffer.writeUInt16BE(classNmae, 2);
                buffer.writeUInt16BE(ttl, 4);
                buffer.writeUInt16BE(data.length, 8);

                return Buffer.concat([Buffer.from(str+'\0', "binary"), buffer, Buffer.from(data + '\0', "binary")]);
            })
        )
    }
}

export default DNSAnswer