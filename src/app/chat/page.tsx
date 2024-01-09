"use client";

import Menu from "@/components/Menu";
import Message, { Skeleton } from "@/components/Message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { httpRequest } from "@/lib/interceptor";
import axios, { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { v4 as idGen } from "uuid";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import * as React from "react";

type Message = {
  id: string;
  message: string;
  isUser: boolean;
  isNew?: boolean;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [temperature, setTemperature] = useState<number>(0.4);
  const { toast } = useToast();

  useEffect(() => {
    httpRequest
      .get("/api/chat")
      .then((res) => {
        setMessages(
          res.data.queries.map((item: any) => {
            return {
              id: item.id,
              message: item.data,
              isUser: item.isUser,
            };
          })
        );
      })
      .catch((err) => {
        if (err instanceof AxiosError)
          toast({
            title: "Error",
            description: err.response?.data.message,
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [toast]);

  function handleEmit() {
    setLoading(true);
    setMessages((prev) => [...prev, { id: idGen(), isUser: true, message }]);
    const t = message;
    setMessage("");
    httpRequest
      .post("/api/chat", {
        message: t,
        temperature,
      })
      .then(({ data }) => {
        setMessages((prev) => [
          ...prev,
          { id: idGen(), isUser: false, message: data.message, isNew: true },
        ]);
      })
      .catch((err) => {
        if (err instanceof AxiosError)
          toast({
            title: "Error",
            description: err.response?.data.message,
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function clear() {
    setMessages([]);
  }

  function updateScroll() {
    var element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(updateScroll, [messages]);

  return (
    <div>
      <Menu clear={clear} />
      <div className="input w-full flex flex-col justify-between h-screen">
        <div
          className="messages w-full mx-auto h-full mb-4 overflow-auto flex flex-col gap-10 pt-10 max-[900px]:pt-20 scroll-smooth"
          ref={scrollRef}
        >
          {messages.map((message) => (
            <Message
              key={message.id}
              id={message.id}
              isUser={message.isUser}
              message={message.message}
              isNew={message.isNew ?? false}
            />
          ))}
          {loading && <Skeleton />}
        </div>
        <div className="w-[40%] max-[900px]:w-[90%] flex flex-row gap-3 mx-auto mt-auto">
          <Input
            onKeyDown={(e) => {
              if (e.keyCode == 13 && message) {
                handleEmit();
              }
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Send a message"
            className="h-12"
          />
          <Button
            disabled={!message}
            onClick={handleEmit}
            className="h-12 font-semibold"
          >
            Send
          </Button>
        </div>
        <Box sx={{ display: "flex", flex: 1, justifyContent: "center" }}>
          <Box
            sx={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              maxWidth: "700px",
              paddingX: 2,
              paddingY: 2,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              temperature (creativity)
            </Box>
            <Slider
              aria-label="Small steps"
              value={temperature}
              onChange={(event: Event, newValue: number | number[]) =>
                !Array.isArray(newValue) && setTemperature(newValue)
              }
              step={0.1}
              marks
              min={0.1}
              max={2.0}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      </div>
    </div>
  );
}
