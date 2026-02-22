# Microsoft Entra External ID (CIAM) — Authentication Module
#
# Creates the CIAM directory via the azapi provider (no native azuread resource yet).
# See: https://github.com/hashicorp/terraform-provider-azuread/issues/1263
#
# After terraform apply, complete these steps in the Azure Portal:
#
# 1. Switch to the CIAM tenant in Azure Portal
# 2. Register a new application:
#    - Name: "GymTrainer Mobile"
#    - Supported account types: "Accounts in this organizational directory only"
#    - Redirect URI: Public client/native — gymtrainer://auth/callback
# 3. Configure Google Identity Provider:
#    - Go to External Identities > All identity providers > Google
#    - Enter your Google OAuth Client ID and Secret
#    - (Create these at https://console.cloud.google.com/apis/credentials)
# 4. Create a User Flow:
#    - Go to External Identities > User flows
#    - Create a "Sign up and sign in" flow
#    - Select Google as identity provider
#    - Configure attributes: Display Name, Email Address
# 5. Note the following values for your app config:
#    - Tenant name: gymtrainerciam
#    - Client ID: from step 2
#    - Authority: https://gymtrainerciam.ciamlogin.com/

resource "azapi_resource" "ciam" {
  type      = "Microsoft.AzureActiveDirectory/ciamDirectories@2023-05-17-preview"
  name      = "${var.ciam_tenant_name}.onmicrosoft.com"
  location  = var.ciam_location
  parent_id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}"

  body = {
    sku = {
      name = "Base"
      tier = "A0"
    }
    properties = {
      createTenantProperties = {
        displayName = var.ciam_display_name
        countryCode = "GB"
      }
    }
  }
}
