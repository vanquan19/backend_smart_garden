const app = require("express")();
const { createServer } = require("node:http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(cors());

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

// Get state control device
app.get("/control", (req, res) => {
    Device.find({})
        .then((data) => {
            res.status(200).json(data);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// connect to socket
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    // Send to the connected user
    socket.emit("event", { message: "Connected !!!!" });

    // On each "status", run this function
    socket.on("status", function (data) {
        console.log(data);
    });
});
