# Handles CORS preflight (OPTIONS) for an API Gateway resource.
# Replaces the deprecated squidfunk/api-gateway-enable-cors/aws registry module.
# Resource names intentionally match the squidfunk v0.3.3 naming so that
# switching the source does not force recreation of existing AWS resources.

resource "aws_api_gateway_method" "cors" {
  rest_api_id   = var.api_id
  resource_id   = var.api_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors" {
  rest_api_id = var.api_id
  resource_id = var.api_resource_id
  http_method = aws_api_gateway_method.cors.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "cors" {
  rest_api_id = var.api_id
  resource_id = var.api_resource_id
  http_method = aws_api_gateway_method.cors.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors" {
  rest_api_id = var.api_id
  resource_id = var.api_resource_id
  http_method = aws_api_gateway_method.cors.http_method
  status_code = aws_api_gateway_method_response.cors.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
