/** Remove passwordHash e demais campos sensíveis antes de serializar. */
export function toSafeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}