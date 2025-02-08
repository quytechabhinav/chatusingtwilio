import React, { useState, useEffect } from "react";
import axios from "axios";
import { Client as TwilioClient } from "@twilio/conversations";

const Chat = ({ username }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversation, setConversation] = useState(null);
    const [client, setClient] = useState(null);

    useEffect(() => {
        const initChat = async () => {
            try {
                console.log("🔄 Fetching token for:", username);
                const { data } = await axios.post("http://localhost:5000/token", { identity: username });

                if (!data.token) {
                    throw new Error("❌ Failed to get token from backend");
                }

                const twilioClient = new TwilioClient(data.token);
                
                // Wait for client to be fully initialized before proceeding
                twilioClient.on("initialized", async () => {
                    console.log("✅ Twilio Client Initialized");
                    setClient(twilioClient);

                    try {
                        console.log("🔄 Fetching existing conversation...");
                        const { data: convData } = await axios.get("http://localhost:5000/get-conversation");

                        let activeConversation;
                        if (convData.sid) {
                            console.log("✅ Found existing conversation:", convData.sid);
                            activeConversation = await twilioClient.getConversationBySid(convData.sid);
                        } else {
                            console.log("⚠️ No existing conversation. Creating a new one...");
                            const response = await axios.post("http://localhost:5000/create-conversation", { friendlyName: "MyChat" });
                            console.log("✅ New Conversation Created:", response.data.sid);
                            activeConversation = await twilioClient.getConversationBySid(response.data.sid);
                        }

                        setConversation(activeConversation);
                        console.log("🔗 Active Conversation SID:", activeConversation.sid);

                        // Add the user to the conversation
                        await axios.post("http://localhost:5000/add-user", {
                            conversationSid: activeConversation.sid,
                            identity: username,
                        });

                        console.log("✅ User added to conversation");

                        // Fetch previous messages
                        const messages = await activeConversation.getMessages();
                        console.log('message new',messages);
                       
                        setMessages(messages.items.map((msg) => ({ author: msg.author, body: msg.body })));

                        // Listen for new messages
                        activeConversation.on("messageAdded", (message) => {
                            console.log("📩 New message received:", message);
                            setMessages((prevMessages) => [...prevMessages, { author: message.author, body: message.body }]);
                        });

                    } catch (error) {
                        console.error("❌ Error fetching or creating conversation:", error);
                    }
                });

                twilioClient.on("stateChanged", (state) => console.log("🔄 Twilio State Changed:", state));

            } catch (error) {
                console.error("❌ Error initializing chat:", error);
            }
        };

        if (username) {
            initChat();
        }
    }, [username]);

    const sendMessage = async () => {
        if (!conversation) {
            console.log("🚨 No active conversation! Trying to fetch...");
            return;
        }

        if (newMessage.trim() !== "") {
            try {
                await conversation.sendMessage(newMessage);
                setMessages((prevMessages) => [...prevMessages, { author: username, body: newMessage }]);
                setNewMessage("");
            } catch (error) {
                console.error("❌ Error sending message:", error);
            }
        } else {
            console.log("⚠️ Cannot send an empty message.");
        }
    };

    return (
        <div style={{ width: "400px", margin: "auto", border: "1px solid #ccc", padding: "10px" }}>
            <h3>Twilio Chat</h3>
            <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ddd", padding: "5px" }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: "5px" }}>
                        <strong>{msg.author}:</strong> {msg.body}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                style={{ width: "80%" }}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default Chat;
