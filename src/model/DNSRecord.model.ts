import mongoose, { Model, Schema } from "mongoose";
import type { IDNSRecord } from "../interface";

const DNSRecordSchema = new Schema<IDNSRecord>(
    {
        name: {
            type: String,
            required: true
        },
        type: {
            type: Number,
            required: true
        },
        class: {
            type: Number,
            required: true;
        },
        ttl: {
            type: Number,
            default: 300
        },
        data: {
            type: String,
            required: true;
        },
        priority: Number,
        port: Number,
        weight: Number
    },
    {
        timestamps: true
    }
)

const DNSRecord: Model<IDNSRecord> = mongoose.model<IDNSRecord>("DNSRecord", DNSRecordSchema)

export default DNSRecord