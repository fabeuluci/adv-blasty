import { Inject, Injectable } from "adv-ioc";
import { Logger } from "adv-log";
import { WebSocketEx } from "../ws/WsEx";

export interface WebSocketEvent {
    type: "connect"|"ping"|"message"|"close";
    websocket: WebSocketEx;
}

export type WebSocketEventListener = (event: WebSocketEvent) => unknown;

export class WebsocketActionService extends Injectable {
    
    @Inject private logger: Logger;
    private listeners: WebSocketEventListener[] = [];
    
    emit(event: WebSocketEvent) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (e) {
                this.logger.error("Error during trigger websocket event listener", event.type, e);
            }
        }
    }
    
    addListener(listener: (event: WebSocketEvent) => unknown) {
        this.listeners.push(listener);
    }
    
    removeListener(listener: (event: WebSocketEvent) => unknown) {
        const index = this.listeners.indexOf(listener);
        if (index != -1) {
            this.listeners.splice(index, 1);
        }
    }
}
