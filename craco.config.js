const fs = require('fs');
const path = require('path');

module.exports = {
  devServer: (devServerConfig, { env, paths }) => {
    // Remove deprecated options to prevent warnings
    delete devServerConfig.onAfterSetupMiddleware;
    delete devServerConfig.onBeforeSetupMiddleware;

    // Fix deprecation warnings by using setupMiddlewares instead of deprecated options
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Load proxy setup if it exists
      const proxySetup = path.resolve(__dirname, 'src/setupProxy.js');
      if (fs.existsSync(proxySetup)) {
        require(proxySetup)(devServer.app);
      }

      return middlewares;
    };

    return devServerConfig;
  },
};
