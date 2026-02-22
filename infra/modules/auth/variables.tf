variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "b2c_tenant_name" {
  description = "Azure AD B2C tenant name (e.g. gymtrainerb2c)"
  type        = string
}

variable "b2c_client_id" {
  description = "Azure AD B2C application client ID (set after manual app registration)"
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
