"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import { Message } from "../types";
import { Input } from "app/components/ui/input";
import { Button } from "app/components/ui/button";
import { Card, CardContent } from "app/components/ui/card";
import { ScrollArea } from "app/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "app/components/ui/avatar";
import { toast } from "sonner";

interface ChatRoomProps {
    roomCode: string;
    userId: string;
    name: string;
}

interface MessageItemProps {
    message: {
        sender: string;
        content: string;
        timestamp: string | number | Date;
        status?: "sent" | "delivered" | "seen";
    };
    self?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, self }) => {
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`flex w-full mb-3 ${self ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-end gap-2 max-w-[75%] ${self ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>{message.sender.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div
                    className={`
              relative rounded-2xl px-4 py-2 shadow-sm
              ${self
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground rounded-bl-none"
                        }
            `}
                >
                    {!self && (
                        <p className="text-xs font-semibold opacity-80 mb-1">{message.sender}</p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    <div className="flex items-center justify-end mt-1 space-x-1 text-[0.7rem] opacity-70">
                        <span>{time}</span>
                        {self && (
                            <span className="text-xs">
                                {message.status === "seen"
                                    ? "✓✓"
                                    : message.status === "delivered"
                                        ? "✓✓"
                                        : "✓"}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomCode, userId, name }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [users, setUsers] = useState(1);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const socketRef = useRef<WebSocket>(getSocket());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const socket = socketRef.current;

        const joinPayload = {
            type: "join-room",
            roomId: roomCode,
            userId,
            name,
        };

        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(joinPayload));
        } else {
            socket.addEventListener("open", () => {
                socket.send(JSON.stringify(joinPayload));
            }, { once: true });
        }

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "joined-room":
                    setMessages(data.messages);
                    toast.success(`Joined room ${roomCode}!`);
                    break;
                case "new-message":
                    setMessages((prev) => [...prev, data.message]);
                    break;
                case "user-joined":
                    setUsers(data.usersCount);
                    toast.info(`${data.name || "A user"} joined the room.`);
                    break;
                case "user-left":
                    setUsers(data.usersCount);
                    toast.info(`${data.name || "A user"} left the room.`);
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
                    toast.error(data.message);
                    if (data.message.includes("Too many requests")) {
                        setIsRateLimited(true);
                        setTimeout(() => {
                            setIsRateLimited(false);
                            toast.info("You can send messages again.");
                        }, 5000); 
                    }
    
                    break;
            }
        };

        socket.addEventListener("message", handleMessage);

        return () => {
            socket.removeEventListener("message", handleMessage);
        };
    }, [roomCode, userId, name]);

    useEffect(() => {
        scrollToBottom();
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        if (socketRef.current.readyState === WebSocket.OPEN && !isRateLimited) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.send(
                    JSON.stringify({ type: "typing", roomCode, userId, name })
                );
            }, 300); 
        }
    };

    const sendMessage = () => {
        if (input.trim() && !isRateLimited) {
            const messagePayload = {
                type: "send-message",
                roomCode,
                message: input,
                userId,
                name,
            };
            socketRef.current.send(JSON.stringify(messagePayload));
            setInput("");
        }
    };

    return (
        <Card className="flex flex-col h-screen w-full max-w-4xl mx-auto rounded-none border-none shadow-none">
            <CardContent className="flex flex-col flex-grow p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold">Room: {roomCode}</h2>
                    <p className="text-sm text-muted-foreground">Users: {users}</p>
                </div>
                <ScrollArea className="flex-1 p-4 space-y-4">
                    {messages.map((msg) => (
                        <MessageItem key={msg.id} message={msg} self={msg.senderId === userId} />
                    ))}
                    <div ref={messagesEndRef} />
                </ScrollArea>
                {typingUser && (
                    <p className="text-sm text-muted-foreground px-4 py-2">{typingUser} is typing...</p>
                )}
                <div className="flex items-center gap-2 p-4 border-t">
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1 text-foreground"
                        disabled={isRateLimited}
                    />
                    <Button onClick={sendMessage} disabled={isRateLimited}>Send</Button>
                </div>
            </CardContent>
        </Card>
    );
};
