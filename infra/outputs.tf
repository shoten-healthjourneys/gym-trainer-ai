output "api_url" {
  description = "Public URL for the FastAPI container app"
  value       = module.container_apps.api_url
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = module.container_apps.acr_login_server
}

output "database_url" {
  description = "PostgreSQL connection string"
  value       = module.postgresql.connection_string
  sensitive   = true
}

output "keyvault_uri" {
  description = "Azure Key Vault URI"
  value       = module.keyvault.vault_uri
}
