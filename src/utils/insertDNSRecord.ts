import DNSRecord from "../model/DNSRecord.model";

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
        const existingRecord = await DNSRecord.findOne({
            name: record.name,
            type: record.type,
            class: record.class
        });

        if (existingRecord) {
            const updatedRecord = await DNSRecord.findByIdAndUpdate(
                existingRecord._id,
                { $set: record },
                { new: true }
            );
            console.log("Updated DNS Record:", updatedRecord);
            return updatedRecord;
        } else {
            const newRecord = await DNSRecord.create(record);
            console.log("Inserted DNS Record:", newRecord);
            return newRecord;
        }
    } catch (err) {
        console.error("Failed to insert or update DNS record:", err);
        throw err;
    }
}

import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});

import { DNSClass, DNSType } from "../enum";
import connectDB from "../db";

(async function () {
    await connectDB()

    // Adding Ptr reverse DNS record for nslookup
    await insertDNSRecord({
        name: "1.0.0.127.in-addr.arpa",
        type: DNSType.PTR,
        class: DNSClass.IN,
        ttl: 300,
        data: "My DNS"
    });

    // A Record for code.io
    await insertDNSRecord({
        name: "code.io",
        type: 1, // A record
        class: 1,
        ttl: 300,
        data: "8.8.8.8"
    });

    // CNAME Record for code.io (alias to example.com)
    await insertDNSRecord({
        name: "www.code.io",
        type: 5, // CNAME
        class: 1,
        ttl: 300,
        data: "example.com"
    });

    // NS Record for zone.example.net
    await insertDNSRecord({
        name: "example.net",
        type: 2, // NS record
        class: 1,
        ttl: 86400,
        data: "ns1.dnsserver.com"
    });

    // AAAA Record for code.io
    await insertDNSRecord({
        name: "code.io",
        type: 28, // AAAA record
        class: 1,
        ttl: 300,
        data: "2001:db8::1"
    });

    // A Record for example.com
    await insertDNSRecord({
        name: "example.com",
        type: 1, // A record
        class: 1,
        ttl: 300,
        data: "192.168.1.1"
    });


}) ();