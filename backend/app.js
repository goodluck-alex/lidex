function createApp() {
  return {
    routes: [],
    use(route) {
      this.routes.push(route);
    }
  };
}

module.exports = { createApp };

