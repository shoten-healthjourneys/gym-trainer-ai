variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "youtube_api_key" {
  description = "YouTube Data API key"
  type        = string
  sensitive   = true
}

variable "deepgram_api_key" {
  description = "Deepgram API key"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}
