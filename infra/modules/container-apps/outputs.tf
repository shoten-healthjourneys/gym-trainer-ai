output "api_url" {
  description = "Public FQDN of the container app"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_name" {
  description = "Azure Container Registry name"
  value       = azurerm_container_registry.acr.name
}

output "container_app_name" {
  description = "Container App name"
  value       = azurerm_container_app.api.name
}
