const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");

require("dotenv").config();
app.use(cors());
app.use(express.json());

const stripe = require("stripe")(process.env.STRIPE_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.moy4n.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const destinationCollection = client
      .db("Padma_Exclusive")
      .collection("destinations");
    const ticketCollection = client.db("Padma_Exclusive").collection("tickets");
    const bookTickets = client.db("Padma_Exclusive").collection("booking");

    // load all destinations
    app.get("/destinations", async (req, res) => {
      const result = await destinationCollection.find({}).toArray();
      res.send(result);
    });

    // load single destination
    app.get("/destination", async (req, res) => {
      const destinationInfo = JSON.parse(req.headers?.destinationinfo);
      const query = { from: destinationInfo?.from, to: destinationInfo?.to };
      const result = await destinationCollection.findOne(query);
      res.send(result);
    });

    // load single destination by id
    app.get("/destinationid", async (req, res) => {
      const destinationDistance = req.query?.destinationDistance;
      const query = {
        from: destinationDistance.split("_")[0],
        to: destinationDistance.split("_")[1],
      };
      const result = await destinationCollection.findOne(query);
      res.send(result);
    });

    // load all tickets
    app.get("/tickets", async (req, res) => {
      const date = req.query.date;
      const result = await ticketCollection.find({}).toArray();
      const loadAllBookings = await bookTickets
        .find({ departDate: date })
        .toArray();
      const allScehdule = [];

      result.map((elResult) => {
        loadAllBookings.map((booking) => {
          if (elResult.busId === booking.busId) {
            elResult.availableSeats.splice(0, booking.selectPassengers.length);
            const findSchedule = allScehdule.find(
              (elFind) => elFind.busId === elResult.busId
            );
            if (!findSchedule) {
              allScehdule.push(elResult);
            }
          } else {
            const findSchedule = allScehdule.find(
              (elFind) => elFind.busId === elResult.busId
            );
            if (!findSchedule) {
              allScehdule.push(elResult);
            }
          }
        });
      });
      if(loadAllBookings.length){
        res.send(allScehdule);
      }
      else{
        res.send(result)
      }
    });

    // load single ticket 
    app.get('/ticket', async(req, res) => {
      const userEmail = req.query.user;
      const result = await bookTickets.find({user: userEmail}).toArray();
      const lastBook = result[result.length - 1];
      res.send(result[result.length - 1]);
      console.log(userEmail)
    })

    // booking ticket
    app.post("/bookTicket", async (req, res) => {
      const ticket = req.body;
      const result = await bookTickets.insertOne(ticket);
    });

    // payment api
    app.post("/paymentIntent", async (req, res) => {
      const { cost } = req.body;
      const costAmount = cost * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: costAmount,
        currency: "bdt",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}
run();

app.get("/", async (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log("server is running on", port);
});

// padma-exclusive
// CwDm4pKrK42pZFuF
