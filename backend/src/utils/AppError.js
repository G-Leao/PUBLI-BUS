/** Erro operacional com status HTTP e lista opcional de erros de validação. */
export class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado: permissão insuficiente") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito com dados existentes") {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida") {
    super(message, 400);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados inválidos", errors = []) {
    super(message, 422, errors);
  }
}