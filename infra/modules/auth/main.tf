# Azure AD B2C — Authentication Module
#
# IMPORTANT: Azure AD B2C tenant creation is not fully automatable via Terraform.
# The azurerm_aadb2c_directory resource can create the B2C directory, but the
# following steps must be completed manually in the Azure Portal:
#
# Manual Steps:
# 1. After terraform apply, go to the B2C tenant in Azure Portal
# 2. Register a new application:
#    - Name: "GymTrainer Mobile"
#    - Supported account types: "Accounts in any identity provider"
#    - Redirect URI: add your Expo auth callback URL
#      (e.g., com.gymtrainer.app://auth/callback)
# 3. Configure Google Identity Provider:
#    - Go to Identity providers > Google
#    - Enter your Google OAuth Client ID and Secret
#    - (Create these at https://console.cloud.google.com/apis/credentials)
# 4. Create User Flows:
#    - Sign up and sign in (B2C_1_signup_signin)
#    - Select Google as identity provider
#    - Application claims: Display Name, Email, Identity Provider
# 5. Note the following values for your app config:
#    - Tenant name: ${var.b2c_tenant_name}.onmicrosoft.com
#    - Client ID: from step 2
#    - Policy name: B2C_1_signup_signin
#    - Authority: https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/B2C_1_signup_signin

resource "azurerm_aadb2c_directory" "b2c" {
  country_code            = "GB"
  data_residency_location = "Europe"
  display_name            = "${var.project_name}-b2c"
  domain_name             = "${var.b2c_tenant_name}.onmicrosoft.com"
  resource_group_name     = var.resource_group_name
  sku_name                = "PremiumP1"
}
