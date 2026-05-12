# Handles CORS preflight (OPTIONS) for an API Gateway resource.
# Replaces the deprecated squidfunk/api-gateway-enable-cors/aws registry module.
#
# The squidfunk v0.3.3 module declared its resources with the local name "_"
# (underscore), while this local module uses "cors". When commit 30bb98f
# swapped the source, Terraform saw the rename as "destroy `_`, create `cors`"
# which on parallel-apply led to PutMethod racing the DeleteMethod, AWS
# replying 409 ("Method already exists for this resource"), and state ending
# up partially migrated.
#
# These `moved` blocks tell Terraform the old `_` addresses are the same
# resources as the new `cors` ones, so state is renamed in place with no AWS
# calls. They are no-ops when the source address isn't present (i.e. the
# instance was successfully migrated already), so they're safe to leave in
# permanently.

moved {
  from = aws_api_gateway_method._
  to   = aws_api_gateway_method.cors
}

moved {
  from = aws_api_gateway_integration._
  to   = aws_api_gateway_integration.cors
}

moved {
  from = aws_api_gateway_method_response._
  to   = aws_api_gateway_method_response.cors
}

moved {
  from = aws_api_gateway_integration_response._
  to   = aws_api_gateway_integration_response.cors
}

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
