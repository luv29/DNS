import DNSRecord from "../model/DNSRecord.model";
import type { IDNSRecord } from "../interface";
import connectDB from "../db";

export async function insertDNSRecord(record: {
    name: string;
    type: number;
    class: number;
    ttl: number;
    data: string;
    priority?: number;
    port?: number;
    weight?: number;
}) {
    try {
        const newRecord = await DNSRecord.create(record);
        console.log("Inserted DNS Record:", newRecord);
        return newRecord;
    } catch (err) {
        console.error("Failed to insert DNS record:", err);
        throw err;
    }
}

// import dotenv from "dotenv";
// dotenv.config({
//     path: "./.env",
// });
// (async function () {
//     await connectDB()

//     // A Record for code.io
//     await insertDNSRecord({
//         name: "code.io",
//         type: 1, // A record
//         class: 1,
//         ttl: 300,
//         data: "8.8.8.8"
//     });

//     // CNAME Record for code.io (alias to example.com)
//     await insertDNSRecord({
//         name: "www.code.io",
//         type: 5, // CNAME
//         class: 1,
//         ttl: 300,
//         data: "example.com"
//     });

//     // NS Record for zone.example.net
//     await insertDNSRecord({
//         name: "example.net",
//         type: 2, // NS record
//         class: 1,
//         ttl: 86400,
//         data: "ns1.dnsserver.com"
//     });

// }) ();