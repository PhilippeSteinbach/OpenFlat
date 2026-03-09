import { useEffect, useRef, useCallback, useState } from 'react';
import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr';

interface UseSignalROptions {
  hubUrl: string;
  enabled?: boolean;
}

export function useSignalR({ hubUrl, enabled = true }: UseSignalROptions) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    connection
      .start()
      .then(() => setIsConnected(true))
      .catch((err) => console.error('SignalR connection error:', err));

    return () => {
      connection.stop();
    };
  }, [hubUrl, enabled]);

  const on = useCallback((methodName: string, callback: (...args: unknown[]) => void) => {
    connectionRef.current?.on(methodName, callback);
    return () => connectionRef.current?.off(methodName, callback);
  }, []);

  const invoke = useCallback(async (methodName: string, ...args: unknown[]) => {
    if (connectionRef.current?.state === HubConnectionState.Connected) {
      return connectionRef.current.invoke(methodName, ...args);
    }
  }, []);

  return { isConnected, on, invoke };
}
