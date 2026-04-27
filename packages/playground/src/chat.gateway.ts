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
  ConnBearerAuth,
  ConnCloseCode,
  ConnHeader,
  ConnQuery,
  ConnSubprotocols,
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
  @ConnBearerAuth()
  @ConnSubprotocols('chat.v1', 'chat.v2')
  @ConnCloseCode({ code: 1000, reason: 'normal_closure', description: 'The client or server cleanly closed the socket.' })
  @ConnCloseCode({ code: 4001, reason: 'unauthorized', description: 'JWT was missing, malformed, or failed validation.' })
  @ConnCloseCode({ code: 4003, reason: 'workspace_not_found', description: 'The `workspace` query did not match any workspace.' })
  @ConnCloseCode({ code: 4029, reason: 'rate_limited', description: 'Too many connection attempts from this client. Backoff and retry.' })
  handleConnection(_client: unknown): void {
    // Auth + workspace pinning would go here in a real app.
  }

  @Receive({
    event: "subscribe",
    payload: SubscribeFrameDto,
    reply: { event: "subscribed", payload: SubscribedFrameDto },
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
    reply: { event: "chat.message.ack", payload: ChatAckFrameDto },
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
