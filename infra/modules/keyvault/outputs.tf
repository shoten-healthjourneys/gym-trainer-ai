output "vault_uri" {
  description = "Azure Key Vault URI"
  value       = azurerm_key_vault.kv.vault_uri
}

output "vault_id" {
  description = "Azure Key Vault resource ID"
  value       = azurerm_key_vault.kv.id
}
