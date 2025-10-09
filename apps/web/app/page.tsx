"use client";

import { useState, useEffect } from "react";
import { getSocket } from "../app/lib/socket";
import ChatBox from "./components/ChatBox";

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [step, setStep] = useState<"form" | "chat">("form");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [userId] = useState(randomId());

  useEffect(() => {
    const socket = getSocket();
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "room-created") {
        setRoomCode(data.roomCode);
        setStep("chat");
      }
    });
  }, []);

  const handleCreate = () => {
    const socket = getSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "create-room" }));
    } else {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "create-room" }));
      });
    }
  };

  const handleJoin = () => {
    if (roomCode && name) {
      setStep("chat");
    }
  };

  if (step === "form") {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border rounded flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Join or Create a Chat Room</h1>
        <input
          className="border rounded px-2 py-1"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Room Code (leave blank to create)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <div className="flex gap-2">
          <button
            className="bg-blue-500 text-white px-4 py-1 rounded"
            onClick={roomCode && name ? handleJoin : handleCreate}
            disabled={!name}
          >
            {roomCode ? "Join Room" : "Create Room"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b font-bold">
        Room: {roomCode} | User: {name}
      </div>
      <ChatBox roomCode={roomCode} userId={userId} name={name} />
    </div>
  );
}
