"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChatWindow } from "@/components/chat/ChatWindow";

const Chat = () => {
    return (
        <DashboardLayout
            title="Team Chat"
            subtitle="Chat with your team — groups and private messages"
        >
            <div className="h-[calc(100vh-12rem)]">
                <ChatWindow />
            </div>
        </DashboardLayout>
    );
};

export default Chat;
