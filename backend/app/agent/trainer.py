import asyncio
import logging

import httpx
from agent_framework.anthropic import AnthropicClient
from agent_framework import MCPStreamableHTTPTool

from app.agent.prompts import SYSTEM_PROMPT
from app.config import settings

logger = logging.getLogger(__name__)

MCP_URL = "http://localhost:8080/mcp"


async def _wait_for_mcp(url: str, timeout: int = 30) -> None:
    """Poll the MCP server until it accepts connections."""
    async with httpx.AsyncClient() as client:
        for attempt in range(timeout):
            try:
                resp = await client.get(url, timeout=2)
                if resp.status_code < 500:
                    logger.info("MCP server ready (attempt %d)", attempt + 1)
                    return
            except httpx.ConnectError:
                pass
            except Exception as e:
                logger.debug("MCP poll attempt %d: %s", attempt + 1, e)
            await asyncio.sleep(1)
    raise RuntimeError(f"MCP server at {url} not ready after {timeout}s")


async def create_agent():
    """Create the trainer agent with MCP tools. Returns (agent, mcp_tool)."""
    client = AnthropicClient(
        model_id="claude-sonnet-4-6",
        api_key=settings.ANTHROPIC_API_KEY,
    )

    # Wait for MCP server to be ready (started as background process in Docker)
    await _wait_for_mcp(MCP_URL)

    mcp_tool = MCPStreamableHTTPTool(
        name="gym-tools",
        url=MCP_URL,
    )
    await mcp_tool.connect()
    logger.info("MCP connected — %d tools loaded", len(mcp_tool.functions))

    agent = client.as_agent(
        name="GymTrainerAgent",
        instructions=SYSTEM_PROMPT,
        tools=mcp_tool,
        default_options={
            "max_tokens": 16000,
        },
    )
    return agent, mcp_tool
