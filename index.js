const app = require("express")();
const http = require("http");
const cors = require("cors");
const boradyParser = require("body-parser");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(cors());
app.use(boradyParser.json());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://itquankma:lqbWKgazyPJNK5vv@cluster0.tr9ng.mongodb.net/smart_garden?retryWrites=true&w=majority&appName=Cluster0");
        console.log("MongoDB is connected");
    } catch (err) {
        console.log(err);
    }
};
connectDB();

// Start server
server.listen(3005, () => {
    console.log("Server is running on " + 3005);
});

// Define schema device and sensor
const deviceSchema = new mongoose.Schema(
    {
        light: Boolean,
        auto: Boolean,
        watering: Boolean,
        heating: Boolean,
    },
    { collection: "controls" }
);

const sensorSchema = new mongoose.Schema(
    {
        result: Array,
    },
    { collection: "sensors" }
);

// Create model device and sensor
const DeviceModal = mongoose.model("coltrol", deviceSchema);
const Sensor = mongoose.model("sensor", sensorSchema);
//
app.get("/", (req, res) => {
    res.status(200).json("Hello World");
});

// Get state control device
app.get("/control", (req, res) => {
    const { devide } = req.query;
    const objFind = {};
    DeviceModal.find(objFind)
        .then((data) => {
            res.status(200).json(data);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// Update state control device
app.post("/control", (req, res) => {
    const { device, state } = req.body;
    console.log(`Received [${device}] : [${state}]`);
    DeviceModal.updateOne({ $set: { [device]: state } })
        .then((data) => {
            console.log(`Updated [${device}] : [${state}]`);
            res.status(200).json({
                message: "Updated successfully",
                data: { [device]: state },
            });
            io.emit("control", { [device]: state });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// Get sensor data
app.post("/sensor", (req, res) => {
    const data = req.body;
    console.log(data);
});

// connect to socket
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("control", (msg) => {
        console.log("message: " + msg);
    });
});
