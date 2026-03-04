import { WebSocketGateway } from './gateway';

let wsGatewayInstance: WebSocketGateway | null = null;

export function setWsGateway(instance: WebSocketGateway): void {
  wsGatewayInstance = instance;
}

export function getWsGateway(): WebSocketGateway {
  if (!wsGatewayInstance) {
    throw new Error('WebSocket gateway not initialized');
  }
  return wsGatewayInstance;
}
