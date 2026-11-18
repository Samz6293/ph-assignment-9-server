import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectToMongoDB } from './database/connect.js';

const app = express();
const PORT = 8080;
app.use(cors());
app.use(express.json());

// Database connect;
const mongoClient = await connectToMongoDB();

app.get("/", (req, res) => {
    res.send({message: "API Working"});
})

app.listen(PORT, ()=> {
    console.log(`Server runnig on: http://localhost:${PORT}`);
})