import mongoose, { Mongoose } from "mongoose";
import logger from "../logger/winston.logger";

const DB_NAME = "DNS";
export let dbInstance: Mongoose | undefined = undefined;

const connectDB = async (): Promise<void> => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );

        dbInstance = connectionInstance;

        logger.info(`MongoDB Connected!`);
    } catch (error) {
        logger.error("MongoDB connection error: ", error);
        process.exit(1);
    }
};

export default connectDB;