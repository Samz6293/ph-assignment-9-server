import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectToMongoDB } from './database/connect.js';
import { verifyToken } from './middleware/verifyToken.js';
import { loadUser } from './middleware/loadUser.js';

const app = express();
const PORT = 8080;
app.use(cors());
app.use(express.json());

// Database connect;
const mongoClient = await connectToMongoDB();

app.get("/", (req, res) => {
    res.send({message: "API Working"});
})

// Users
// the signed-in user's own account, straight from the database
app.get("/users/me", verifyToken, loadUser, (req, res) => {
    res.send(req.user);
});

app.listen(PORT, ()=> {
    console.log(`Server runnig on: http://localhost:${PORT}`);
})