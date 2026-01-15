import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

const cartRoutes = (cartCollection) => {

  router.post("/", async (req, res) => {
    const result = await cartCollection.insertOne(req.body);
    res.send(result);
  });

  router.get("/", async (req, res) => {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send({ message: "Email required" });
    }

    const result = await cartCollection
      .find({ customerEmail: email })
      .toArray();

    res.send(result);
  });

  router.patch("/quantity/:id", async (req, res) => {
    const { quantity } = req.body;

    const result = await cartCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { quantity } }
    );

    res.send(result);
  });

  router.get("/:id", async (req, res) => {
    const result = await cartCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  });

  router.delete("/:id", async (req, res) => {
    const result = await cartCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  });

  return router;
};

export default cartRoutes;
