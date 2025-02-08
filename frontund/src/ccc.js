import React, { useState, useEffect, useRef } from "react";

import axios from "axios";
import { Client as TwilioClient } from "@twilio/conversations";

const Chat = ({ username }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversation, setConversation] = useState(null);
    const [client, setClient] = useState(null);
    const messagesEndRef = useRef(null); // Ref for auto-scroll

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
     // Function to **STOP the chat** (remove conversation)
     const stopChat = async () => {
        if (!conversationSid) {
            console.log("⚠️ No active conversation to stop.");
            return;
        }

        try {
            console.log("🚨 Stopping conversation:", conversationSid);
            await axios.post("http://localhost:5000/delete-conversation", {
                conversationSid,
            });

            console.log("✅ Conversation deleted successfully!");

            setMessages([]);
            setConversation(null);
            setConversationSid(null);

            if (client) {
                client.shutdown();
                setClient(null);
            }
        } catch (error) {
            console.error("❌ Error stopping conversation:", error);
        }
    };

    return (
        <div style={styles.chatContainer}>
            <h3 style={styles.header}>Twilio Chat</h3>
            <div style={styles.chatBox}>
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        ...styles.message,
                        alignSelf: msg.author === username ? "flex-end" : "flex-start",
                        backgroundColor: msg.author === username ? "#dcf8c6" : "#fff"
                    }}>
                        <strong>{msg.author}:</strong> {msg.body}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div style={styles.inputContainer}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={styles.input}
                />
                <button onClick={sendMessage} style={styles.sendButton}>Send</button>
                <button
                onClick={stopChat}
                style={{ marginLeft: "5px", padding: "8px 12px", borderRadius: "5px", border: "none", backgroundColor: "#FF3B30", color: "#fff" }}
            >
                Stop Chat
            </button>
            </div>
        </div>
    );
};

const styles = {
    chatContainer: {
        width: "400px",
        margin: "auto",
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "10px",
        backgroundColor: "#f9f9f9",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        textAlign: "center",
        marginBottom: "10px",
        fontSize: "18px",
        fontWeight: "bold",
    },
    chatBox: {
        height: "300px",
        overflowY: "auto",
        border: "1px solid #ddd",
        borderRadius: "5px",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
    },
    message: {
        maxWidth: "70%",
        padding: "8px",
        borderRadius: "10px",
        marginBottom: "5px",
        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
    },
    inputContainer: {
        display: "flex",
        marginTop: "10px",
    },
    input: {
        flex: 1,
        padding: "8px",
        borderRadius: "5px",
        border: "1px solid #ccc",
    },
    sendButton: {
        marginLeft: "10px",
        padding: "8px 12px",
        border: "none",
        borderRadius: "5px",
        backgroundColor: "#007bff",
        color: "#fff",
        cursor: "pointer",
    },
};

export default Chat;
