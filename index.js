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

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    // Food Collection

    app.get("/food-menu", async (req, res) => {
      const result = await foodMenuCollection.find().toArray();
      res.send(result);
    });

    app.get("/food-menu/:id", async (req, res) => {
      const id = req.params.id;

      const result = await foodMenuCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

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

      const result = await foodMenuCollection.deleteOne(
        { _id: new ObjectId(id) }
      );

      res.send(result);
    });

    // Send a ping to confirm a successful connections
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
