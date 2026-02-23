"""Patch missing SpanAttributes before any agent_framework import.

The agent-framework-core package references SpanAttributes that don't exist
in opentelemetry-semantic-conventions-ai 0.4.x. This module adds them.
Import this module BEFORE importing agent_framework anywhere.
"""

from opentelemetry.semconv_ai import SpanAttributes as _SA

_MISSING_ATTRS = {
    "LLM_SYSTEM": "gen_ai.system",
    "LLM_REQUEST_MODEL": "gen_ai.request.model",
    "LLM_RESPONSE_MODEL": "gen_ai.response.model",
    "LLM_REQUEST_MAX_TOKENS": "gen_ai.request.max_tokens",
    "LLM_REQUEST_TEMPERATURE": "gen_ai.request.temperature",
    "LLM_REQUEST_TOP_P": "gen_ai.request.top_p",
    "LLM_TOKEN_TYPE": "gen_ai.token.type",
}
for _attr, _val in _MISSING_ATTRS.items():
    if not hasattr(_SA, _attr):
        setattr(_SA, _attr, _val)
