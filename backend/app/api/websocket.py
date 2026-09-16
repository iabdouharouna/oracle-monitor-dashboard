from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import asyncio
import json
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "overview": [],
            "sql_monitor": [],
            "sessions": [],
            "performance": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        logger.info("WebSocket connected", channel=channel, total=len(self.active_connections[channel]))

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
        logger.info("WebSocket disconnected", channel=channel, total=len(self.active_connections.get(channel, [])))

    async def broadcast(self, channel: str, message: dict):
        if channel in self.active_connections:
            disconnected = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            
            for dc in disconnected:
                self.disconnect(dc, channel)


manager = ConnectionManager()


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    valid_channels = ["overview", "sql_monitor", "sessions", "performance"]
    if channel not in valid_channels:
        await websocket.close(code=4004, reason="Invalid channel")
        return
    
    await manager.connect(websocket, channel)
    try:
        while True:
            # Keep connection alive, listen for ping/pong or client messages
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        logger.error("WebSocket error", channel=channel, error=str(e))
        manager.disconnect(websocket, channel)


# Helper functions for services to push updates
async def push_overview_update(data: dict):
    await manager.broadcast("overview", {"type": "overview_update", "payload": data})

async def push_sql_monitor_update(data: dict):
    await manager.broadcast("sql_monitor", {"type": "sql_monitor_update", "payload": data})

async def push_sessions_update(data: dict):
    await manager.broadcast("sessions", {"type": "sessions_update", "payload": data})

async def push_performance_update(data: dict):
    await manager.broadcast("performance", {"type": "performance_update", "payload": data})