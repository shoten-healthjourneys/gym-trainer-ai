output "server_fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.pg.fqdn
}

output "database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.db.name
}

output "connection_string" {
  description = "PostgreSQL connection string for asyncpg"
  value       = "postgresql://${var.admin_username}:${var.admin_password}@${azurerm_postgresql_flexible_server.pg.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
  sensitive   = true
}
