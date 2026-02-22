output "ciam_tenant_name" {
  description = "Entra External ID (CIAM) tenant name"
  value       = var.ciam_tenant_name
}

output "ciam_domain" {
  description = "CIAM tenant domain"
  value       = "${var.ciam_tenant_name}.onmicrosoft.com"
}

output "ciam_authority" {
  description = "CIAM authority URL for sign-in"
  value       = "https://${var.ciam_tenant_name}.ciamlogin.com/"
}

output "ciam_client_id" {
  description = "CIAM application client ID"
  value       = var.ciam_client_id
}
