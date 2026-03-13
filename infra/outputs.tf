output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain — point your Cloudflare CNAME here"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploading site content"
  value       = aws_s3_bucket.site.id
}

output "acm_validation_records" {
  description = "Add these CNAME records in Cloudflare to validate the ACM certificate"
  value = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      type  = dvo.resource_record_type
      name  = dvo.resource_record_name
      value = dvo.resource_record_value
    }
  }
}

output "site_url" {
  description = "Live site URL"
  value       = "https://${var.domain_name}"
}
