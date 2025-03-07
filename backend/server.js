import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js"
import connectMongoDB from "./db/connectMongoDb.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000

app.use("/api/auth", authRoutes);


app.listen(3000, () => {
    console.log(`Server running on port ${PORT}`)
    connectMongoDB();
});