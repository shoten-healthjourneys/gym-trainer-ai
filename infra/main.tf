terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  required_version = ">= 1.5.0"
}

provider "azurerm" {
  features {}
}

provider "azapi" {}

provider "random" {}

resource "azurerm_resource_group" "rg" {
  name     = "${var.project_name}-rg"
  location = var.location
}

module "postgresql" {
  source = "./modules/postgresql"

  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  admin_username      = var.pg_admin_username
  admin_password      = var.pg_admin_password
  project_name        = var.project_name
}

module "container_apps" {
  source = "./modules/container-apps"

  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  project_name        = var.project_name
  database_url        = module.postgresql.connection_string
  anthropic_api_key   = var.anthropic_api_key
  youtube_api_key     = var.youtube_api_key
  deepgram_api_key    = var.deepgram_api_key
}

module "auth" {
  source = "./modules/auth"

  resource_group_name = azurerm_resource_group.rg.name
  subscription_id     = data.azurerm_client_config.current.subscription_id
  ciam_tenant_name    = var.ciam_tenant_name
  ciam_display_name   = var.ciam_display_name
  ciam_location       = var.ciam_location
  ciam_client_id      = var.ciam_client_id
}

module "keyvault" {
  source = "./modules/keyvault"

  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  project_name        = var.project_name
  anthropic_api_key   = var.anthropic_api_key
  youtube_api_key     = var.youtube_api_key
  deepgram_api_key    = var.deepgram_api_key
  database_url        = module.postgresql.connection_string
}

data "azurerm_client_config" "current" {}
