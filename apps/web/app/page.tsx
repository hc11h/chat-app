"use client";

import { useState, useEffect } from "react";
import { getSocket } from "./lib/socket";
// import ChatBox from "./components/ChatBox"; // Will be replaced by ChatRoom

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChatRoom } from "./components/chat-room";

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
        toast.success(`Room ${data.roomCode} created!`);
      } else if (data.type === "error") {
        toast.error(data.message);
      }
    });
    socket.addEventListener("close", () => {
      toast.info("Disconnected from server.");
      setStep("form");
    });
    socket.addEventListener("error", (err) => {
      toast.error("WebSocket error occurred.");
      console.error("WebSocket error:", err);
    });
  }, [userId]); // Added userId to dependencies as it is used in the useEffect callback

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const socket = getSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "create-room" }));
    } else {
      toast.info("Connecting to server...");
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "create-room" }));
      }, { once: true }); // Use once: true to prevent multiple listeners
    }
  };

  const handleJoin = () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!roomCode.trim()) {
      toast.error("Please enter a room code.");
      return;
    }
    const socket = getSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "join-room", roomCode, userId, name }));
      setStep("chat");
      toast.success(`Joining room ${roomCode}...`);
    } else {
      toast.info("Connecting to server...");
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join-room", roomCode, userId, name }));
        setStep("chat");
        toast.success(`Joining room ${roomCode}...`);
      }, { once: true });
    }
  };

  if (step === "form") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-center">Join or Create a Chat Room</CardTitle>
            <CardDescription className="text-center">Enter your name and optionally a room code.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-foreground"
            />
            <Input
              placeholder="Room Code (leave blank to create)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="text-foreground"
            />
            <Button
              onClick={roomCode && name ? handleJoin : handleCreate}
              disabled={!name.trim()}
              className="w-full"
            >
              {roomCode ? "Join Room" : "Create Room"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ChatRoom roomCode={roomCode} userId={userId} name={name} />
  );
}