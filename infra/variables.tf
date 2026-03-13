variable "domain_name" {
  description = "The domain name for the portfolio site"
  type        = string
  default     = "tanel.dev"
}

variable "aws_region" {
  description = "AWS region for the S3 bucket"
  type        = string
  default     = "eu-north-1"
}
