import { IDNSQuestion } from "../interface";

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

    // static parse(questionBuffer: Buffer): IDNSQuestion {
    //     let doveSto = 0;
    //     const labels = [];
    
    //     while (questionBuffer[doveSto] !== 0) {
    //         const labelLength = questionBuffer.readUInt8(doveSto);
    //         doveSto++;
            
    //         const label = questionBuffer.subarray(doveSto, doveSto + labelLength).toString();
            
    //         labels.push(label);
    //         doveSto += labelLength;
    //     }
    
    //     doveSto++;
    
    //     const type = questionBuffer.readUInt16BE(doveSto);
    //     doveSto += 2;
    
    //     const classCode = questionBuffer.readUInt16BE(doveSto);
    //     doveSto += 2;
    
    //     const name = labels.join(".");

    //     return {
    //         name,
    //         type,
    //         class: classCode,
    //     };
    // }

    static parse(questionBuffer: Buffer): { question: IDNSQuestion, length: number} {
        let doveSto = 0;
        const labels = [];
    
        while (questionBuffer[doveSto] !== 0) {
            const labelLength = questionBuffer.readUInt8(doveSto);
            doveSto++;
            const label = questionBuffer.subarray(doveSto, doveSto + labelLength).toString();
            labels.push(label);
            doveSto += labelLength;
        }
    
        doveSto++; // skip null byte
        const type = questionBuffer.readUInt16BE(doveSto); doveSto += 2;
        const classCode = questionBuffer.readUInt16BE(doveSto); doveSto += 2;
    
        return {
            question: {
                name: labels.join("."),
                type,
                class: classCode
            },
            length: doveSto
        };
    }
    
}

export default DNSQuestion;