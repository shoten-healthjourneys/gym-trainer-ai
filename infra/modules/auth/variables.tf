variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "ciam_tenant_name" {
  description = "Entra External ID (CIAM) tenant name (e.g. gymtrainerciam)"
  type        = string
}

variable "ciam_display_name" {
  description = "Display name for the CIAM tenant"
  type        = string
  default     = "GymTrainer"
}

variable "ciam_location" {
  description = "CIAM data residency location (europe, unitedstates, asiapacific, australia, japan)"
  type        = string
  default     = "europe"
}

variable "ciam_client_id" {
  description = "CIAM application client ID (set after manual app registration in Portal)"
  type        = string
  default     = ""
}
