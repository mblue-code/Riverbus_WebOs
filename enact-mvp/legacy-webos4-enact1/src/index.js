import '@enact/moonstone/styles/skin.less';
import {render} from 'react-dom';
import App from './App/App';
import './styles/main.less';

if (typeof document !== 'undefined') {
	const debugNode = document.createElement('div');
	debugNode.id = 'legacy-debug-overlay';
	debugNode.style.position = 'fixed';
	debugNode.style.top = '16px';
	debugNode.style.left = '16px';
	debugNode.style.zIndex = '9999';
	debugNode.style.padding = '8px 12px';
	debugNode.style.background = 'rgba(0, 128, 255, 0.85)';
	debugNode.style.color = '#fff';
	debugNode.style.fontFamily = 'Arial, sans-serif';
	debugNode.style.fontSize = '16px';
	debugNode.style.borderRadius = '4px';
	debugNode.textContent = 'Legacy app booting…';
	document.body.appendChild(debugNode);

	const updateOverlay = (message, isError) => {
		if (!debugNode) {
			return;
		}
		debugNode.style.background = isError ? 'rgba(200, 0, 0, 0.85)' : 'rgba(0, 128, 255, 0.85)';
		debugNode.textContent = message;
	};

	updateOverlay('Legacy app booting…', false);

	if (typeof window !== 'undefined') {
		window.addEventListener(
			'error',
			(event) => updateOverlay(`Error: ${event && event.message ? event.message : 'Unknown error'}`, true)
		);
		window.addEventListener(
			'unhandledrejection',
			(event) =>
				updateOverlay(
					`Promise error: ${
						event && event.reason && event.reason.message ? event.reason.message : 'Unknown rejection'
					}`,
					true
				)
		);
		window.__updateLegacyOverlay = updateOverlay;
	}
}

render(<App />, document.getElementById('root'));

if (typeof window !== 'undefined' && window.__updateLegacyOverlay) {
	window.__updateLegacyOverlay('Legacy app rendered.', false);
	setTimeout(() => {
		if (window.__updateLegacyOverlay) {
			window.__updateLegacyOverlay('Legacy app running.', false);
		}
	}, 1500);
}
