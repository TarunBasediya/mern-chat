import React, { useState, useEffect } from "react";
import socket from "../utils/socket";
import { useNavigate } from "react-router-dom";

const Chat = () => {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const user = JSON.parse(sessionStorage.getItem("user"));

  useEffect(() => {
    // Handle typing notifications
    socket.on("displayTyping", (typingUser) => {
      setTypingUser(typingUser);
    });

    socket.on("removeTyping", () => {
      setTypingUser("");
    });

    // Notify user of new messages in other rooms
    socket.on("newMessageNotification", (messageData) => {
      if (messageData.room !== room) {
        alert(`New Message in room ${messageData.room}: ${messageData.text}`);
      }
    });

    // Handle incoming messages
    socket.on("receiveMessage", (messageData) => {
      setMessages((prevMessages) => {
        // Prevent duplicate messages by checking timestamp + text
        const isDuplicate = prevMessages.some(
          (msg) =>
            msg.text === messageData.text &&
            msg.timestamp === messageData.timestamp
        );
        return isDuplicate ? prevMessages : [...prevMessages, messageData];
      });
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("displayTyping");
      socket.off("removeTyping");
      socket.off("receiveMessage");
      socket.off("newMessageNotification");
    };
  }, [room]);

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket.emit("typing", room, user?.name);
    }

    const timeout = setTimeout(() => {
      setTyping(false);
      socket.emit("stopTyping", room);
    }, 2000);

    return () => clearTimeout(timeout);
  };

  const joinRoom = () => {
    if (room.trim()) {
      socket.emit("joinRoom", room);
      setMessages([]); // Clear messages when joining a new room
    } else {
      alert("Room name cannot be empty.");
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!room.trim()) {
      alert("You must join a room before sending messages.");
      return;
    }

    if (message.trim()) {
      const messageData = {
        user: user?.name || "Anonymous",
        text: message,
        room: room,
        timestamp: new Date().toISOString(),
      };
      socket.emit("sendMessage", messageData);
      setMessages((prevMessages) => [...prevMessages, messageData]);
      setMessage("");
      setTyping(false);
      socket.emit("stopTyping", room);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear(); // Clear user session data
    navigate("/"); // Redirect to the login page
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100">
      <h1 className="text-3xl font-bold my-4">Real-Time Chat</h1>
      {typingUser && (
        <p className="text-sm text-gray-500 italic">
          {typingUser} is typing...
        </p>
      )}

      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-200"
      >
        Logout
      </button>

      <div className="flex items-center space-x-4 mb-4">
        <input
          type="text"
          placeholder="Enter Room Name"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          className="border border-gray-300 rounded-md p-2"
        />
        <button
          onClick={joinRoom}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Join Room
        </button>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="h-80 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`my-2 ${
                msg.user === user?.name ? "text-right" : "text-left"
              }`}
            >
              <strong>{msg.user}:</strong> {msg.text}{" "}
              <small className="text-gray-500">
                ({new Date(msg.timestamp).toLocaleTimeString()})
              </small>
            </div>
          ))}
        </div>
      </div>

      <form
        className="flex items-center w-full max-w-3xl space-x-4"
        onSubmit={sendMessage}
      >
        <input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyUp={handleTyping}
          className="border border-gray-300 rounded-md flex-grow p-2"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
