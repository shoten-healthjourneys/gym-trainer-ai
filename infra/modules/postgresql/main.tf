# Azure PostgreSQL Flexible Server — Burstable B1ms for personal use (~£10/month)

resource "azurerm_postgresql_flexible_server" "pg" {
  name                          = "${var.project_name}-pg"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  administrator_login           = var.admin_username
  administrator_password        = var.admin_password
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = 32768
  version                       = "16"
  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = "${var.project_name}-db"
  server_id = azurerm_postgresql_flexible_server.pg.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Allow Azure services to connect (required for Container Apps)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.pg.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
