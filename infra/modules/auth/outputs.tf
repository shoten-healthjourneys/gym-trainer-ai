output "b2c_tenant_name" {
  description = "Azure AD B2C tenant name"
  value       = var.b2c_tenant_name
}

output "b2c_domain" {
  description = "Azure AD B2C domain"
  value       = "${var.b2c_tenant_name}.onmicrosoft.com"
}

output "b2c_authority" {
  description = "Azure AD B2C authority URL for sign-in policy"
  value       = "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/B2C_1_signup_signin"
}

output "b2c_client_id" {
  description = "Azure AD B2C application client ID"
  value       = var.b2c_client_id
}
