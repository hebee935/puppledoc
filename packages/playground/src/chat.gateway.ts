import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type WsResponse,
} from "@nestjs/websockets";
import type { Server } from "ws";
import {
  Conn,
  ConnAuth,
  ConnHeader,
  ConnQuery,
  Receive,
  Send,
  WsTags,
} from "@puppledoc/nestjs-api-reference";
import {
  ChatAckFrameDto,
  ChatMessageFrameDto,
  HandshakeQueryDto,
  HelloFrameDto,
  PresenceFrameDto,
  SubscribeFrameDto,
  SubscribedFrameDto,
  TypingFrameDto,
} from "./dto";

@WsTags("Realtime")
@WebSocketGateway({ path: "/realtime" })
@Send({
  event: "hello",
  payload: HelloFrameDto,
  summary: "Emitted right after the socket opens",
})
@Send({
  event: "presence.update",
  payload: PresenceFrameDto,
  summary: "A channel member went online/offline",
})
@Send({
  event: "typing",
  payload: TypingFrameDto,
  summary: "Broadcast when someone in the channel is typing",
})
export class ChatGateway {
  @WebSocketServer() server!: Server;

  @Conn({
    description:
      "Authenticate the upgrade with a JWT (`?token=…` for browsers, `Authorization: Bearer …` for native clients) and pin the session to a workspace via the `workspace` query param.",
  })
  @ConnQuery(HandshakeQueryDto)
  @ConnHeader({
    name: "Authorization",
    description:
      "Alternative to `?token=` — `Bearer <jwt>`. Browsers can't set this, but `wscat`/`curl`/server-side clients can.",
  })
  @ConnAuth({
    name: "token",
    required: true,
    description:
      "When using socket.io clients, pass the JWT here instead of the query string.",
  })
  handleConnection(_client: unknown): void {
    // Auth + workspace pinning would go here in a real app.
  }

  @Receive({
    event: "subscribe",
    payload: SubscribeFrameDto,
    reply: SubscribedFrameDto,
    summary: "Subscribe to a channel",
    description:
      "Start receiving `message.created`, `typing` and `presence.update` for the given channel.",
  })
  @SubscribeMessage("subscribe")
  onSubscribe(
    @MessageBody() dto: SubscribeFrameDto,
  ): WsResponse<SubscribedFrameDto> {
    return {
      event: "subscribed",
      data: { type: "subscribed", channelId: dto.channelId, memberCount: 12 },
    };
  }

  @Receive({
    event: "chat.message",
    payload: ChatMessageFrameDto,
    reply: ChatAckFrameDto,
    summary: "Post a message to a channel",
    description:
      "Server replies with an ack carrying the assigned `messageId`.",
  })
  @SubscribeMessage("chat.message")
  onChatMessage(
    @MessageBody() _dto: ChatMessageFrameDto,
  ): WsResponse<ChatAckFrameDto> {
    const messageId = `msg_${Date.now().toString(36)}`;
    return {
      event: "chat.message.ack",
      data: {
        type: "chat.message.ack",
        messageId,
        createdAt: new Date().toISOString(),
      },
    };
  }

  @Receive({
    event: "typing",
    payload: TypingFrameDto,
    summary: "Notify the channel that the user is typing (no reply)",
  })
  @SubscribeMessage("typing")
  onTyping(@MessageBody() _dto: TypingFrameDto): void {
    // fan-out to other subscribers would go here
  }
}
