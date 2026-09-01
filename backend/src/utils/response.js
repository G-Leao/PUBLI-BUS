export const apiResponse = (success = true, message = '', data = null, errors = []) => {
  return {
    success,
    message,
    data,
    errors,
  };
};

export const generateId = () => crypto.randomUUID();

export const formatError = (error) => {
  return {
    message: error.message || 'Internal server error',
    code: error.code || 'UNKNOWN_ERROR',
  };
};
