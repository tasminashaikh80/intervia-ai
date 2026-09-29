const appPromise = import("../server/server.mjs");

export default async function handler(req, res) {
  const { default: app } = await appPromise;
  return app(req, res);
}