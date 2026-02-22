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

variable "ciam_tenant_name" {
  description = "Entra External ID (CIAM) tenant name (e.g. gymtrainerciam)"
  type        = string
  default     = "gymtrainerciam"
}

variable "ciam_display_name" {
  description = "Display name for the CIAM tenant"
  type        = string
  default     = "GymTrainer"
}

variable "ciam_location" {
  description = "CIAM data residency location"
  type        = string
  default     = "europe"
}

variable "ciam_client_id" {
  description = "CIAM application client ID (set after manual app registration)"
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "Secret key for signing JWT tokens"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "gym-trainer"
}
