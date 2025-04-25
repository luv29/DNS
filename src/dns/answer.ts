import { IDNSAnswer } from "../interface"

class DNSAnswer {
    static write(answers: IDNSAnswer[]) {
        return Buffer.concat(
            answers.map((answer) => {
                const questionLabels = answer.name
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
                dnsTypeBuffer.writeUInt16BE(answer.type)
                
                const dnsClassBuffer = Buffer.alloc(2)
                dnsClassBuffer.writeUInt16BE(answer.class)
                
                const ttlBuffer = Buffer.alloc(4)
                ttlBuffer.writeUInt32BE(answer.TTL)
                
                const lengthBuffer = Buffer.alloc(2)
                lengthBuffer.writeUInt16BE(answer.length)
                
                const dataLabels = answer.data
                    .split(".")
                    .map(label => {
                        const buff= Buffer.alloc(1)
                        buff.writeUInt8(Number(label))
                        
                        return buff
                    })

                return  Buffer.concat([...questionLabels, endBuffer, dnsTypeBuffer, dnsClassBuffer,ttlBuffer,lengthBuffer,...dataLabels]);
            })
        )
    }
}

export default DNSAnswer