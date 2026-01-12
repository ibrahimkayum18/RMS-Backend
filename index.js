const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("@dotenvx/dotenvx").config();

const {
  sendAdminEmail,
  sendCustomerEmail,
} = require("./utils/sendEmail");

const app = express();
const port = process.env.PORT || 5000;

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());

// =====================
// MONGODB
// =====================
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("RMS");
    const foodMenuCollection = db.collection("Food_Menu");
    const userCollection = db.collection("Users");
    const contactCollection = db.collection("contact");

    console.log("✅ MongoDB connected");

    // =====================
    // FOOD MENU APIs
    // =====================
    app.get("/food-menu", async (req, res) => {
      const result = await foodMenuCollection.find().toArray();
      res.send(result);
    });

    // individual food collection

    app.get("/food-menu/:id", async (req, res) => {
      const result = await foodMenuCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // Update food menu products

    app.patch("/food-menu/:id", async (req, res) => {
      const result = await foodMenuCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

     // Delete food menu products

    app.delete("/food-menu/:id", async (req, res) => {
      const result = await foodMenuCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // =====================
    // USERS API
    // =====================
    app.post("/users", async (req, res) => {
      try {
        const { name, email } = req.body;
        if (!email) {
          return res.status(400).send({ message: "Email required" });
        }

        const existingUser = await userCollection.findOne({ email });

        if (existingUser) {
          await userCollection.updateOne(
            { email },
            {
              $set: { "activity.lastLogin": new Date() },
              $inc: { "activity.loginCount": 1 },
            }
          );
          return res.send({ success: true, user: existingUser });
        }

        const newUser = {
          name,
          email,
          role: "customer",
          activity: {
            createdAt: new Date(),
            lastLogin: new Date(),
            loginCount: 1,
          },
        };

        const result = await userCollection.insertOne(newUser);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // =====================
    // CONTACT FORM API
    // =====================
    app.post("/api/contact", async (req, res) => {
      try {
        const { firstName, lastName, email, message } = req.body;

        if (!firstName || !lastName || !email || !message) {
          return res
            .status(400)
            .json({ success: false, message: "All fields required" });
        }

        const contactData = {
          firstName,
          lastName,
          email,
          message,
          createdAt: new Date(),
        };

        // Save to DB
        await contactCollection.insertOne(contactData);

        // Send emails (non-blocking)
        try {
          await sendAdminEmail(contactData);
          await sendCustomerEmail(contactData);
        } catch (emailError) {
          console.error("⚠️ Email failed:", emailError.message);
        }

        res.status(201).json({
          success: true,
          message: "Message received successfully",
        });
      } catch (error) {
        console.error("Contact API error:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    app.get("/api/contact", async (req, res) => {
      const result = await contactCollection.find().toArray();
      res.send(result);
    })

    // Ping DB
    await client.db("admin").command({ ping: 1 });
  } catch (error) {
    console.error(error);
  }
}

run();

// =====================
// ROOT
// =====================
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
