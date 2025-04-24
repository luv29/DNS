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
    class: DNSClass;
}

class DNSQuestion {
    static write(questions: IDNSQuestion[]) {
        return Buffer.concat(questions.map(question => { 
            const questionLabels = question.name
                .split(".")
                .map(label => {
                    const length = label.length
                    const buff = Buffer.alloc(length + 1)
                    
                    buff.writeUInt8(length)
                    buff.write(label, 1)
                    
                    return buff
                })

            const endBuffer = Buffer.alloc(1)
            endBuffer.writeUInt8(0)

            const dnsTypeBuffer = Buffer.alloc(2)
            dnsTypeBuffer.writeUInt16BE(question.type)
            
            const dnsClassBuffer = Buffer.alloc(2)
            dnsClassBuffer.writeUInt16BE(question.class)
            
            return Buffer.concat([...questionLabels, endBuffer, dnsTypeBuffer, dnsClassBuffer]);  
        }));
    }

    static parse(questionBuffer: Buffer): IDNSQuestion {
        let doveSto = 0;
        const labels = [];
    
        while (questionBuffer[doveSto] !== 0) {
            const labelLength = questionBuffer.readUInt8(doveSto);
            doveSto++;
            
            const label = questionBuffer.subarray(doveSto, doveSto + labelLength).toString();
            
            labels.push(label);
            doveSto += labelLength;
        }
    
        doveSto++;
    
        const type = questionBuffer.readUInt16BE(doveSto);
        doveSto += 2;
    
        const classCode = questionBuffer.readUInt16BE(doveSto);
        doveSto += 2;
    
        const name = labels.join(".");
    
        console.log(`Parsed Question → Name: ${name}, Type: ${type}, Class: ${classCode}`);
    
        return {
            name,
            type,
            class: classCode,
        };
    }
}

export default DNSQuestion;