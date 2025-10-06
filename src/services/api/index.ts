/**
 * API Endpoint Extraction Services
 * 
 * This module provides tools for extracting and analyzing API endpoints
 * from various web frameworks.
 */

export { ExpressEndpointExtractor } from './ExpressEndpointExtractor';
export { FastifyEndpointExtractor } from './FastifyEndpointExtractor';
export { NextJSApiExtractor } from './NextJSApiExtractor';
export { APIAnalyzer } from './APIAnalyzer';

// Re-export types for convenience
export {
  APIEndpoint,
  SimpleEndpoint,
  HTTPMethod,
  RouteParameter,
  MiddlewareInfo,
  APIRouter,
  AuthenticationType,
  RequestBodySchema,
  ResponseSchema,
  WebFramework,
  ParameterType
} from '../../types/api';
