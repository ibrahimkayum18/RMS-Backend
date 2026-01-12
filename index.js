const express = require("express");
const { ObjectId } = require("mongodb");
const cors = require("cors");
require("@dotenvx/dotenvx").config();
const app = express();
const port = 5000;

//middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://smibrahimkayum_db_user:iNPDPSCtTEd4E9eS@kayum.qxnbmk4.mongodb.net/?appName=Kayum`;

// Create MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const foodMenuCollection = client.db("RMS").collection("Food_Menu");
    const userCollection = client.db("RMS").collection("Users");

    // Food Collections

    app.get("/food-menu", async (req, res) => {
      const result = await foodMenuCollection.find().toArray();
      res.send(result);
    });

    // individual food collection

    app.get("/food-menu/:id", async (req, res) => {
      const id = req.params.id;

      const result = await foodMenuCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // Update food menu products

    app.patch("/food-menu/:id", async (req, res) => {
      const id = req.params.id;

      const result = await foodMenuCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
      );

      res.send(result);
    });

    app.delete("/food-menu/:id", async (req, res) => {
      const id = req.params.id;

      const result = await foodMenuCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // User collection

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;

      const result = await userCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    app.post("/users", async (req, res) => {
      try {
        const { name, email } = req.body;

        if (!email) {
          return res.status(400).send({
            success: false,
            message: "Email is required",
          });
        }

        // Check if customer already exists
        const existingUser = await userCollection.findOne({ email });

        // 🔐 LOGIN FLOW
        if (existingUser) {
          // Update last login activity
          const updateResult = await userCollection.updateOne(
            { email },
            {
              $set: {
                "activity.lastLogin": new Date(),
                "activity.status": "active",
              },
              $inc: {
                "activity.loginCount": 1,
              },
            }
          );

          return res.status(200).send({
            success: true,
            message: "Login successful",
            user: existingUser,
          });
        }

        // 🆕 REGISTER FLOW
        const newUser = {
          name,
          email,
          role: "customer",
          activity: {
            createdAt: new Date(),
            lastLogin: new Date(),
            loginCount: 1,
            status: "active",
          },
        };

        const result = await userCollection.insertOne(newUser);

        res.status(201).send({
          success: true,
          message: "Customer registered successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Server error",
        });
      }
    });

    // Send a ping to confirm a successful connections with app
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
