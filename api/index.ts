type HonoApp = {
  fetch: (request: Request) => Response | Promise<Response>;
};

let app: HonoApp | undefined;

export default {
  async fetch(request: Request): Promise<Response> {
    if (!app) {
      const mod = await import('../backend/src/app.js');
      app = mod.default;
    }
    return app.fetch(request);
  },
};
