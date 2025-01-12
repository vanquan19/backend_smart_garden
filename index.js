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
app.use(boradyParser.urlencoded({ extended: true }));
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
        ldrPoint: Number,
        temperaturePoint: Number,
        humidityPoint: Number,
    },
    { collection: "controls" }
);

const sensorDataSchema = new mongoose.Schema({
    total: { type: Number, required: true },
    timestame: { type: Date, required: true },
});

const sensorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        data: { type: [sensorDataSchema], required: true },
    },
    { collection: "sensors" }
);

// Create model device and sensor
const DeviceModal = mongoose.model("coltrol", deviceSchema);
const Sensor = mongoose.model("sensor", sensorSchema);
//
app.get("/", (req, res) => {
    io.on("connection", (socket) => {
        console.log("a user connected");
        socket.on("disconnect", () => {
            console.log("user disconnected");
        });
    });
    return res.status(200).json("Hello ESP32 IOT Smart Garden.");
});

// Get state control device
app.get("/control", async (req, res) => {
    const { device } = req.query;
    try {
        if (!device) {
            const data = await DeviceModal.find({});
            console.log(data);

            return res.status(200).json({ data });
        }
        const deviceData = await DeviceModal.findOne({ name: device });

        if (!deviceData) {
            return res.status(404).json({ error: "Device not found" });
        }

        // Trả về trạng thái của thiết bị
        res.status(200).json({ [device]: deviceData.state });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update state control device
app.post("/control", (req, res) => {
    let { device, state, from = "esp32" } = req.body;
    console.log(`Received [${device}] : [${state}]`);
    DeviceModal.updateOne({ $set: { [device]: state } })
        .then((data) => {
            console.log(`Updated [${device}] : [${state}]`);
            res.status(200).json({
                message: "Updated successfully",
                data: { [device]: state },
            });
            io.emit(`control-${device}-${from}`, state);
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});
// Get list temperature
app.get("/temperature", async (req, res) => {
    let { limit, page } = req.query;
    try {
        if (limit && page) {
            page = +page - 1;
            const total = await Sensor.findOne({ name: "temperature" }).select("data").countDocuments();
            const data = await Sensor.findOne({ name: "temperature" })
                .select("data")
                .limit(+limit)
                .skip(page * +limit);
            return res.status(200).json({
                totalPage: Math.ceil(total / limit),
                data: data.data,
                message: "Lây dữ liệu thành công",
            });
        }
        const data = await Sensor.findOne({ name: "temperature" }).select("data");
        return res.status(200).json({ data: data.data, message: "Lấy dữ liệu thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Get list humidity
app.get("/humidity", async (req, res) => {
    let { limit, page } = req.query;
    try {
        if (limit && page) {
            page = +page - 1;
            const total = await Sensor.findOne({ name: "humidity" }).select("data").countDocuments();
            const data = await Sensor.findOne({ name: "humidity" })
                .select("data")
                .limit(+limit)
                .skip(page * +limit);
            return res.status(200).json({
                totalPage: Math.ceil(total / limit),
                data: data.data,
                message: "Lây dữ liệu thành công",
            });
        }
        const data = await Sensor.findOne({ name: "humidity" }).select("data");
        return res.status(200).json({ data: data.data, message: "Lấy dữ liệu thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Get list ldr
app.get("/ldr", async (req, res) => {
    let { limit, page } = req.query;
    try {
        if (limit && page) {
            page = +page - 1;
            const total = await Sensor.findOne({ name: "ldr" }).select("data").countDocuments();
            const data = await Sensor.findOne({ name: "ldr" })
                .select("data")
                .limit(+limit)
                .skip(page * +limit);
            return res.status(200).json({
                totalPage: Math.ceil(total / limit),
                data: data.data,
                message: "Lây dữ liệu thành công",
            });
        }
        const data = await Sensor.findOne({ name: "ldr" }).select("data");
        return res.status(200).json({ data: data.data, message: "Lấy dữ liệu thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// update sensor data
app.post("/sensor", async (req, res) => {
    const { temperature, humidity, ldr } = req.body;

    const timestamp = new Date();
    if (!temperature || !humidity || !ldr) {
        return res.status(400).json({ message: "Missing data" });
    }
    try {
        //get prev timestamp
        let prevTimestampDoc = await Sensor.findOne({ name: "temperature" });
        prevTimestampDoc = prevTimestampDoc.data.slice(-1)[0].timestame;
        if (prevTimestampDoc) {
            let prevTimestamp = new Date(prevTimestampDoc);
            const diffInms = timestamp - prevTimestamp;
            if (diffInms < 30 * 60 * 1000) {
                io.emit("sensor-temp", { message: "Dữ liệu được gửi đi.", data: { temperature, humidity, ldr } });
                return res.status(200).json({ message: "Dữ liệu đã được gửi đi" });
            }
        }

        // Add data for temperature
        await Sensor.updateOne({ name: "temperature" }, { $push: { data: { total: temperature, timestame: timestamp } } }, { upsert: true });

        // Add data for humidity
        await Sensor.updateOne({ name: "humidity" }, { $push: { data: { total: humidity, timestame: timestamp } } }, { upsert: true });

        // Add data for ldr
        await Sensor.updateOne({ name: "ldr" }, { $push: { data: { total: ldr, timestame: timestamp } } }, { upsert: true });

        io.emit("sensor", { message: "Dữ liệu đã được cập nhật.", data: { temperature, humidity, ldr } });
        return res.status(200).json({ message: "Dữ liệu đã được cập nhật vào db." });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

app.get("/sensors", async (req, res) => {
    try {
        const temperature = await Sensor.findOne({ name: "temperature" }).select("data");
        const humidity = await Sensor.findOne({ name: "humidity" }).select("data");
        const ldr = await Sensor.findOne({ name: "ldr" }).select("data");

        return res.status(200).json({ temperature: temperature.data.slice(-1)[0], humidity: humidity.data.slice(-1)[0], ldr: ldr.data.slice(-1)[0] });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// connect to socket
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});
