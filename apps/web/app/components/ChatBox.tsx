"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import MessageItem from "./MessageItem";
import { Message } from "../types";

export default function ChatBox({
  roomCode,
  userId,
  name
}: {
  roomCode: string;
  userId: string;
  name: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState(1);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const socketRef = useRef<WebSocket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const joinPayload = {
      type: "join-room",
      roomId: roomCode,
      userId,
      name
    };

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(joinPayload));
    } else {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify(joinPayload));
      });
    }

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "joined-room":
          setMessages(data.messages);
          break;
        case "new-message":
          setMessages((prev) => [...prev, data.message]);
          break;
        case "user-joined":
        case "user-left":
          setUsers(data.usersCount);
          break;
        case "typing":
          if (data.userId !== userId) {
            setTypingUser(data.name || "Someone");
            setTimeout(() => setTypingUser(null), 2000);
          }
          break;
        case "message-seen":
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId ? { ...msg, status: "seen" } : msg
            )
          );
          break;
        case "error":
          console.error("WebSocket error:", data.message);
          break;
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [roomCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "typing", roomCode, userId, name })
      );
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      const messagePayload = {
        type: "send-message",
        roomCode,
        message: input,
        userId,
        name
      };
      socketRef.current.send(JSON.stringify(messagePayload));
      setInput("");
    }
  };

  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.senderId !== userId && lastMsg.status !== "seen") {
      socketRef.current.send(
        JSON.stringify({
          type: "seen-message",
          roomCode,
          messageId: lastMsg.id,
          userId,
        })
      );
    }
  }, [messages, roomCode, userId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} self={msg.senderId === userId} />
        ))}
      </div>
      <div className="p-2 flex gap-2">
        <input
          className="flex-1 border rounded px-2"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={sendMessage}>
          Send
        </button>
      </div>
      <div className="text-xs text-gray-500 p-2">Users in room: {users}</div>
      {typingUser && (
        <div className="text-xs text-blue-500 p-2">{typingUser} is typing...</div>
      )}
    </div>
  );
}
