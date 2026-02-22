variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
}
