export function successResponse(data = null, message = "Success", statusCode = 200) {
  return { success: true, message, data, statusCode };
}

export function errorResponse(message = "Error", statusCode = 400, errors = null) {
  return { success: false, message, errors, statusCode };
}

export function validationErrorResponse(errors, message = "Validation failed") {
  return errorResponse(message, 422, errors);
}

export function notFoundResponse(message = "Resource not found") {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function paginatedResponse(items, pagination, message = "Success") {
  return { success: true, message, data: items, pagination };
}
