class OracleMonitorException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class DatabaseConnectionError(OracleMonitorException):
    def __init__(self, message: str = "Database connection failed"):
        super().__init__(message, "DATABASE_CONNECTION_ERROR", 503)


class AuthenticationError(OracleMonitorException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class AuthorizationError(OracleMonitorException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "AUTHORIZATION_ERROR", 403)


class NotFoundError(OracleMonitorException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)


class ValidationError(OracleMonitorException):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, "VALIDATION_ERROR", 422)