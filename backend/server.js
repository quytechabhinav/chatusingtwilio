require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { AccessToken } = twilio.jwt;
const { ChatGrant } = AccessToken;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN; // ✅ Corrected auth token usage
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const serviceSid = process.env.TWILIO_CHAT_SERVICE_SID;

const client = twilio(accountSid, authToken); // ✅ Ensure client is initialized correctly
let conversationSid = null;

// ✅ Create a new conversation
app.post("/create-conversation", async (req, res) => {
    try {
        const { friendlyName } = req.body;

        // Check if conversation already exists
        const conversations = await client.conversations.v1.conversations.list();
        let existingConversation = conversations.find(conv => conv.friendlyName === friendlyName);

        if (!existingConversation) {
            existingConversation = await client.conversations.v1.conversations.create({
                friendlyName,
            });
            console.log("✅ New Conversation Created:", existingConversation.sid);
        } else {
            console.log("🔄 Using existing conversation:", existingConversation.sid);
        }

        res.json({ sid: existingConversation.sid });
    } catch (error) {
        console.error("❌ Error creating/fetching conversation:", error);
        res.status(500).json({ error: error.message });
    }
});


// ✅ Add a user to a conversation
app.post('/add-user', async (req, res) => {
    try {
        console.log('🔹 Adding user to conversation...');
        const { conversationSid, identity } = req.body;

        if (!conversationSid || !identity) {
            return res.status(400).json({ error: "conversationSid and identity are required" });
        }

        console.log('conversationSid:', conversationSid);

        // ✅ Check if the user is already a participant
        const participants = await client.conversations.v1.conversations(conversationSid)
            .participants
            .list();

        const isUserAlreadyAdded = participants.some(participant => participant.identity === identity);

        if (isUserAlreadyAdded) {
            console.log(`⚠️ User ${identity} is already in conversation ${conversationSid}`);
            return res.json({ message: "User already exists in conversation" });
        }

        // ✅ Add the user only if they're not already in the conversation
        await client.conversations.v1.conversations(conversationSid)
            .participants
            .create({ identity });

        console.log(`✅ User ${identity} added to conversation ${conversationSid}`);
        res.json({ message: "User added successfully" });

    } catch (error) {
        console.error('❌ Error adding user:', error);
        res.status(500).send(error.message);
    }
});




// ✅ Generate Twilio Token
app.post('/token', async (req, res) => {
    try {
        const { identity } = req.body;
        if (!identity) return res.status(400).json({ error: "Identity is required" });

        const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
        token.addGrant(new ChatGrant({ serviceSid }));

        console.log(`✅ Token generated for: ${identity}`);
        res.json({ token: token.toJwt() });
    } catch (error) {
        console.error("❌ Error generating token:", error);
        res.status(500).json({ error: "Failed to generate token" });
    }
});

// 🔹 Ensure a user is added to the conversation when they join
app.post("/join-conversation", async (req, res) => {
    try {
        const { friendlyName, identity } = req.body;

        // Check if the conversation exists
        const conversations = await twilioClient.conversations.v1.conversations.list();
        let conversation = conversations.find(conv => conv.friendlyName === friendlyName);

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        // Add user as participant if not already added
        const participants = await conversation.participants.list();
        const isUserAdded = participants.some(p => p.identity === identity);

        if (!isUserAdded) {
            await conversation.participants.create({ identity });
            console.log(`✅ User '${identity}' joined conversation.`);
        }

        res.json({ sid: conversation.sid });
    } catch (error) {
        console.error("❌ Error joining conversation:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/get-conversation", async (req, res) => {
    let { conversationSid } = req.body;
    console.log('conversationSidconversationSidconversationSid',conversationSid);
    
    if (conversationSid) {
        return res.send({ sid: conversationSid });
    }

    const conversations = await client.conversations.v1.conversations.list();
    console.log('777777',conversations[0].sid);
    
    if (conversations.length > 0 && conversations.length != undefined) {
        conversationSid = conversations[0].sid;
        return res.send({ sid: conversationSid });
    }

    res.send({ sid: null });
});





// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
