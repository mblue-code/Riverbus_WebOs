const path = require('path');

module.exports = function configureLegacyWebpack(config) {
	const projectNodeModules = path.resolve(__dirname, 'node_modules');

	config.resolve = config.resolve || {};
	config.resolve.alias = config.resolve.alias || {};
	config.resolve.alias.react = path.join(projectNodeModules, 'react');
	config.resolve.alias['react-dom'] = path.join(projectNodeModules, 'react-dom');

	return config;
};
