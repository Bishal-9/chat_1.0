require('dotenv').config()
const server = require('http').createServer().listen(4000)
const mongoClient = require('mongodb').MongoClient
const client = require("socket.io")(server, {
   cors: {
      origin: "*",
   },
})

const mongodb_uri = process.env.MONGODB_URI
const mongodb = new mongoClient(mongodb_uri)

async function main() {
   try {
      const database = mongodb.db('chat')
      const chat = database.collection('chats')

      client.on("connection", function (socket) {

         // Create function to send status
         sendStatus = function (s) {
            socket.emit("status", s)
         }

         // Get chats from mongo collection
         chat
            .find()
            .limit(100)
            .sort({ _id: 1 })
            .toArray(function (error, result) {
               if (error) {
                  throw error
               }

               // Emit the messages
               socket.emit("output", result)
            })

         // Handle input events
         socket.on("input", function (data) {
            let name = data.name
            let message = data.message

            // Check for name and message
            if (name === "" || message === "") {
               // Send error status
               sendStatus("Please enter a name and message")
            } else {
               // Insert message into the database
               chat.insertOne({ name, message }, function () {
                  client.emit("output", [data])

                  // Send status object
                  sendStatus({
                     message: "Message sent",
                     clear: true,
                  })
               })
            }
         })

         // Handle clear
         socket.on("clear", function (data) {
            // Remove all chats from collection
            chat.remove({}, function () {
               // Emit cleared event
               socket.emit("cleared")
            })
         })
      })
   } catch (error) {
      await mongodb.close()
   }
}

main().catch(error => console.error('Error occurred: ', error.message))
