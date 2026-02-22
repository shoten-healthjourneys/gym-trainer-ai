variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "uksouth"
}

variable "pg_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  sensitive   = true
}

variable "pg_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key for Claude models"
  type        = string
  sensitive   = true
}

variable "youtube_api_key" {
  description = "YouTube Data API key for exercise video search"
  type        = string
  sensitive   = true
}

variable "deepgram_api_key" {
  description = "Deepgram API key for voice-to-text fallback"
  type        = string
  sensitive   = true
}

variable "b2c_tenant_name" {
  description = "Azure AD B2C tenant name (e.g. gymtrainerb2c)"
  type        = string
}

variable "b2c_client_id" {
  description = "Azure AD B2C application client ID"
  type        = string
}

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "gym-trainer"
}
