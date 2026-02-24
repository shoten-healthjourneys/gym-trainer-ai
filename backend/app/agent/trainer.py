from agent_framework.anthropic import AnthropicClient
from agent_framework import MCPStreamableHTTPTool

from app.agent.prompts import SYSTEM_PROMPT
from app.config import settings


async def create_agent():
    """Create the trainer agent with MCP tools. Returns (agent, mcp_tool)."""
    client = AnthropicClient(
        model_id="claude-sonnet-4-5-20250929",
        api_key=settings.ANTHROPIC_API_KEY,
    )
    mcp_tool = MCPStreamableHTTPTool(
        name="gym-tools",
        url="http://localhost:8080/mcp",
    )
    await mcp_tool.connect()

    agent = client.as_agent(
        name="GymTrainerAgent",
        instructions=SYSTEM_PROMPT,
        tools=mcp_tool,
        default_options={
            "max_tokens": 16000,
        },
    )
    return agent, mcp_tool
