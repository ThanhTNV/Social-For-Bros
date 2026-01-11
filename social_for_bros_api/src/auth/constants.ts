export const jwtConstants = {
  secret: process.env.JWT_SECRET,
  expiresInSeconds: Number.parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '60'),
};

export const sessionConstants = {
  expiresInDays: Number.parseInt(process.env.SESSION_EXPIRES_IN_DAYS || '7'),
};
