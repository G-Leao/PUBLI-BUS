import { z } from "zod";

/**
 * Valida o conteúdo de req[source] (body, query, params) com um schema Zod.
 * Em caso de erro retorna 422 com erros estruturados.
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(422).json({
      success: false,
      message: "Dados inválidos",
      errors: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
  req[source] = result.data;
  return next();
};

export { z };