const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

//middleware
app.use(cors({
  origin:['https://car-doctor-1937b.web.app','https://car-doctor-1937b.firebaseapp.com','http://localhost:5173'],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7xouwts.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const verifyToken = async (req,res,next)=>{
  const token = req.cookies?.token
  if(!token){
    return res.send({message:'not authorized'})
  }
  jwt.verify(token,process.env.ACCESSS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'Unauthorized'})
    }
    console.log(decoded)
    req.user = decoded
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db('carDoctor').collection('services')
    const orderCollection = client.db('carDoctor').collection('orders')
    //get request for loading services collection
    app.post('/jwt', async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESSS_TOKEN_SECRET, { expiresIn: '1h' }); 
      res
      .cookie('token',token,{
        httpOnly:false,
        secure:true,
        samesite:none
       
      })
      .send({success:true})
    })

    app.post('/logout', async(req,res)=>{
      const user = req.body
      console.log('logging out user',user)
      res.clearCookie('token',{maxAge:0}).send({success:true})
    })
    app.get('/services',async(req,res)=>{
        const cursor = serviceCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    app.get('/services/:id', async(req,res)=>{
        const id = req.params.id
        const query = {_id: new ObjectId(id)}
        const options ={
            projection: { _id: 1, title: 1, img:1 },
        }
        const result = await serviceCollection.findOne(query,options)
        res.send(result)
    })
    //get request for mybookings
    app.get('/order',verifyToken,async(req,res)=>{
        const query = {email:req.query.email}
        if(req.query.email!==req.user.userEmail){
          return res.status(403).send("forbidden")
        }
        console.log(req.cookies.token)
        console.log("request for valid user",req.user)
        const result = await orderCollection.find(query).toArray()
        res.send(result)
    })
    //delete request for an item
    app.delete('/order/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })
    //post request for order
    app.post('/order', async(req,res)=>{
        const order = req.body
        const result = await orderCollection.insertOne(order)
        res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Car doctor server is running')
})

app.listen(port,()=>{
    console.log(`car doctor server is running on ${port}`)
})