import { Message } from "../types";

export default function MessageItem({ message, self }: { message: Message; self: boolean }) {
  return (
    <div className={self ? "self-end text-right" : "self-start text-left"}>
      <div className="font-bold">{message.sender}</div>
      <div>{message.content}</div>
      <div className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
}