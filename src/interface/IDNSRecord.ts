import { Document } from "mongoose";

export interface IDNSRecord extends Document {
    name: string;
    type: number;
    class: number;
    ttl: number;
    data: string;
    priority?: number;
    port?: number;
    weight?: number;
}