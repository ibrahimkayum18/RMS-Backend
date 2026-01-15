const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("@dotenvx/dotenvx").config();

const {
  sendAdminEmail,
  sendCustomerEmail,
  sendCustomerReplyEmail,
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
    const cartCollection = db.collection("cart");
    const orderCollection = db.collection("order");

    console.log("✅ MongoDB connected");

    // =====================
    // FOOD MENU APIs
    // =====================
    app.post("/food-menu", async (req, res) => {
      const body = req.body;
      const result = await foodMenuCollection.insertOne(body);
      res.send(result);
    });

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

    app.patch("/update/:id", async (req, res) => {
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
    // CART API
    // =====================

    app.post("/cart", async (req, res) => {
      const body = req.body;
      const result = await cartCollection.insertOne(body);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email required" });

      const result = await cartCollection
        .find({ customerEmail: email })
        .toArray();

      res.send(result);
    });

    app.patch("/cart/quantity/:id", async (req, res) => {
      const { quantity } = req.body;

      const result = await cartCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: { quantity: quantity },
        }
      );

      res.send(result);
    });

    app.get("/cart/:id", async (req, res) => {
      const result = await cartCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const result = await cartCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // =====================
    // Checkout API
    // =====================

    app.post("/checkout", async (req, res) => {
      try {
        const {
          customerEmail,
          customerName,
          phone,
          address,
          city,
          paymentMethod,
          items,
          subtotal,
          deliveryFee = 0,
          total,
          transactionId = null,
        } = req.body;

        // ✅ Basic validation
        if (!customerEmail || !items || items.length === 0) {
          return res.status(400).send({
            success: false,
            message: "Invalid order data",
          });
        }

        // ✅ Build order object
        const order = {
          customerEmail,
          customerName,
          phone,
          address,
          city,
          items,

          subtotal: Number(subtotal),
          deliveryFee: Number(deliveryFee),
          total: Number(total),

          paymentMethod, // cod | card | sslcommerz
          transactionId,

          paymentStatus: paymentMethod === "cod" ? "unpaid" : "paid",

          orderStatus: "processing", // ✅ default state

          createdAt: new Date(),
        };

        // ✅ Insert order
        const result = await orderCollection.insertOne(order);

        // ✅ Clear cart
        await cartCollection.deleteMany({
          customerEmail,
        });

        res.send({
          success: true,
          message: "Order placed successfully",
          orderId: result.insertedId,
        });
      } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).send({
          success: false,
          message: "Checkout failed",
        });
      }
    });

    app.get("/orders", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    app.get("/orders/:id", async (req, res) => {
      const result = await orderCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.patch("/orders/:id", async (req, res) => {
      const { status } = req.body;

      const result = await orderCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { orderStatus: status } }
      );

      res.send(result);
    });


    app.delete("/orders/:id", async (req, res) => {
      const result = await orderCollection.deleteOne({
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
              $set: { "activity.lastLogin": new Date(), Role: "guest" },
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

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // DELETE a customer by ID
    app.delete("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to delete customer",
        });
      }
    });

    // UPDATE customer role
    app.patch("/users/role/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        if (!role) {
          return res.status(400).send({ message: "Role is required" });
        }

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: role,
          },
        };

        const result = await userCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Customer not found" });
        }

        res.send({
          success: true,
          message: "Role updated successfully",
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to update role",
        });
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
          status: "Unread",
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
    });

    app.get("/api/contact/:id", async (req, res) => {
      const id = req.params;
      const result = await contactCollection.findOne(id);
      res.send(result);
    });

    // Update message status
    app.put("/api/contact/:id", async (req, res) => {
      try {
        const { id } = req.params; // Message ID from URL
        const { status } = req.body; // New status from request body

        if (!status) {
          return res.status(400).send({ error: "Status is required" });
        }

        const result = await contactCollection.updateOne(
          { _id: new ObjectId(id) }, // Convert id string to ObjectId
          { $set: { status } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ error: "Message not found or already updated" });
        }

        res.send({ success: true, message: "Status updated successfully" });
      } catch (error) {
        console.error("Failed to update message status:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // Delete a message by ID
    app.delete("/api/contact/:id", async (req, res) => {
      try {
        const { id } = req.params; // Message ID from URL

        const result = await contactCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Message not found" });
        }

        res.send({ success: true, message: "Message deleted successfully" });
      } catch (error) {
        console.error("Failed to delete message:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    /**
     * Send reply to a customer message
     * POST /api/contact/reply
     * Body: { email: string, subject: string, message: string }
     */

    app.post("/api/contact/reply", async (req, res) => {
      try {
        const { email, subject, message, firstName } = req.body;

        if (!email || !message) {
          return res
            .status(400)
            .send({ error: "Email and message are required" });
        }

        const contactData = {
          firstName,
          email,
          message,
          subject,
        };

        // Send emails (non-blocking)
        try {
          await sendCustomerReplyEmail(contactData);
        } catch (emailError) {
          console.error("⚠️ Email failed:", emailError.message);
        }

        res.status(201).json({
          success: true,
          message: "Message received successfully",
        });
      } catch (error) {
        console.error("Failed to send reply:", error);
        res.status(500).send({ error: "Failed to send reply" });
      }
    });

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
