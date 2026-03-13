export const ENV = {
  appId: process.env.VITE_APP_ID ?? "controle-gastos-web",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  pluggyClientId: process.env.PLUGGY_CLIENT_ID ?? "",
  pluggyClientSecret: process.env.PLUGGY_CLIENT_SECRET ?? "",
};
