/* eslint-env node */

const Module = require('module');
const https = require('https');
const fs = require('fs');
const path = require('path');

const extraNodePaths = ['/usr/lib/nodejs', '/usr/lib/iotjs'].filter(Boolean);
const existingNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(':') : [];
const mergedNodePath = Array.from(new Set(existingNodePath.concat(extraNodePaths))).filter(Boolean);

if (mergedNodePath.length > 0) {
	process.env.NODE_PATH = mergedNodePath.join(':');
	Module._initPaths();
}

const Service = require('webos-service');

const FLOATPLANE_HOST = 'www.floatplane.com';
const TRUSTED_UA = process.env.FLOATPLANE_UA || 'Hydravion 1.0 (AndroidTV), CFNetwork';
const SESSION_FILE = path.join(__dirname, 'session.json');
const DEBUG_LOG = path.join(__dirname, 'debug.log');

const service = new Service('com.community.floatplane.enactmvp.login');

let sessionState = loadSessionFromDisk();

function logDebug(message, data) {
	try {
		const record = {
			timestamp: new Date().toISOString(),
			message,
			data
		};
		fs.appendFileSync(DEBUG_LOG, JSON.stringify(record) + '\n', 'utf8');
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn('[login-service] Failed to write debug log', error.message);
	}
}

function loadSessionFromDisk() {
	try {
		const raw = fs.readFileSync(SESSION_FILE, 'utf8');
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch (error) {
		return {};
	}
}

function persistSession(nextSession) {
	sessionState = nextSession ? Object.assign({}, nextSession) : {};
	try {
		if (sessionState && Object.keys(sessionState).length) {
			fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionState, null, 2), 'utf8');
		} else if (fs.existsSync(SESSION_FILE)) {
			fs.unlinkSync(SESSION_FILE);
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn('[login-service] Failed to persist session', error.message);
	}
}

function sanitizeCookies(cookies) {
	if (!Array.isArray(cookies)) {
		return [];
	}
	return cookies
		.map((cookie) => {
			if (!cookie) {
				return '';
			}
			return String(cookie).split(';')[0];
		})
		.filter(Boolean);
}

function buildCookieHeader(cookies) {
	return sanitizeCookies(cookies).join('; ');
}

function updateSession(options) {
	const existing = sessionState || {};
	const nextCookies = sanitizeCookies(options && options.cookies ? options.cookies : existing.cookies || []);
	const cookieHeader = nextCookies.length ? buildCookieHeader(nextCookies) : null;
	const nextSession = {
		user: options && options.user ? options.user : existing.user || null,
		cookies: nextCookies,
		cookieHeader,
		updatedAt: Date.now()
	};
	persistSession(nextSession);
	return nextSession;
}

function applySetCookieCookies(setCookies) {
	if (!setCookies || !setCookies.length) {
		return sessionState;
	}
	const mergedCookies = sanitizeCookies((sessionState && sessionState.cookies) || []).concat(sanitizeCookies(setCookies));
	return updateSession({cookies: mergedCookies, user: sessionState ? sessionState.user : null});
}

function respondSuccess(message, payload) {
	const body = payload || {};
	message.respond(Object.assign({returnValue: true}, body));
}

function respondError(message, errorText, statusCode, extra) {
	const response = Object.assign(
		{
			returnValue: false,
			statusCode: statusCode || 500,
			errorCode: statusCode || 500,
			errorText: errorText || 'Service error'
		},
		extra || {}
	);
	message.respond(response);
}

function performRequest(method, pathName, options) {
	const opts = options || {};
	logDebug('http_request', {
		method,
		path: pathName,
		payload: opts.payload ? Object.keys(opts.payload) : null,
		hasCookies: Boolean((opts.cookies && opts.cookies.length) || (sessionState && sessionState.cookieHeader))
	});
	return new Promise((resolve, reject) => {
		const data = opts.payload ? JSON.stringify(opts.payload) : null;
		const headers = {
			Accept: 'application/json',
			'User-Agent': TRUSTED_UA
		};
		if (data) {
			headers['Content-Type'] = 'application/json';
			headers['Content-Length'] = Buffer.byteLength(data);
		}
		if (opts.headers) {
			Object.keys(opts.headers).forEach((key) => {
				headers[key] = opts.headers[key];
			});
		}
		if (opts.cookies && opts.cookies.length) {
			headers.Cookie = buildCookieHeader(opts.cookies);
		} else if (sessionState && sessionState.cookieHeader) {
			headers.Cookie = sessionState.cookieHeader;
		}

		const requestOptions = {
			hostname: FLOATPLANE_HOST,
			port: 443,
			path: pathName,
			method,
			headers
		};

		const req = https.request(requestOptions, (res) => {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => {
				body += chunk;
			});
			res.on('end', () => {
				let parsedBody;
				try {
					parsedBody = body ? JSON.parse(body) : {};
				} catch (error) {
					parsedBody = {message: body};
				}
				const responseCookies = res.headers && res.headers['set-cookie'] ? res.headers['set-cookie'] : [];
				logDebug('http_response', {
					method,
					path: pathName,
					statusCode: res.statusCode,
					bodyKeys: parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody) ? Object.keys(parsedBody) : null,
					bodyType: Array.isArray(parsedBody) ? 'array' : typeof parsedBody,
					cookieCount: responseCookies.length
				});
				if (res.statusCode >= 400) {
					let bodyPreview = parsedBody;
					if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
						bodyPreview = {
							message: parsedBody.message || null,
							errors: parsedBody.errors || null,
							keys: Object.keys(parsedBody)
						};
					} else if (typeof parsedBody === 'string') {
						bodyPreview = parsedBody.slice(0, 500);
					}
					logDebug('http_error_body', {
						method,
						path: pathName,
						statusCode: res.statusCode,
						body: bodyPreview
					});
				}
				resolve({
					statusCode: res.statusCode,
					body: parsedBody,
					cookies: responseCookies
				});
			});
		});

		req.on('error', (error) => reject(error));
		req.setTimeout(opts.timeout || 20000, () => {
			req.destroy(new Error('Floatplane request timed out'));
		});

		if (data) {
			req.write(data);
		}
		req.end();
	});
}

function ensureAuth(message, payload) {
	const explicitHeader = payload && payload.cookieHeader ? payload.cookieHeader : null;
	const explicitCookies = payload && payload.cookies ? payload.cookies : null;
	if (explicitHeader) {
		return explicitHeader;
	}
	if (explicitCookies && explicitCookies.length) {
		return buildCookieHeader(explicitCookies);
	}
	if (sessionState && sessionState.cookieHeader) {
		return sessionState.cookieHeader;
	}
	respondError(message, 'Not authenticated. Please sign in first.', 401);
	return null;
}

function normalizeSubscriptions(body) {
	if (!body) {
		return [];
}
	if (Array.isArray(body.subscriptions)) {
		return body.subscriptions;
	}
	if (Array.isArray(body.items)) {
		return body.items;
	}
	if (Array.isArray(body)) {
		return body;
	}
	return [];
}

function getCreatorIdFromSubscription(subscription) {
	if (!subscription) {
		return null;
	}
	const creatorField = subscription.creator;
	if (!creatorField) {
		return null;
	}
	if (typeof creatorField === 'string') {
		return creatorField;
	}
	if (typeof creatorField === 'object') {
		if (creatorField.id) {
			return creatorField.id;
		}
		if (creatorField.slug) {
			return creatorField.slug;
		}
		if (creatorField.handle) {
		 return creatorField.handle;
		}
		if (creatorField.guid) {
			return creatorField.guid;
		}
	}
	return null;
}

async function fetchCreatorDetails(creatorIds) {
	const uniqueIds = Array.from(new Set((creatorIds || []).filter(Boolean)));
	const collected = [];
	for (let index = 0; index < uniqueIds.length; index += 1) {
		const id = uniqueIds[index];
		try {
			const response = await performRequest('GET', '/api/v3/creator/info?id=' + encodeURIComponent(id));
			if (response.statusCode >= 400 || !response.body) {
				continue;
			}
			collected.push(response.body);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn('[login-service] Failed to fetch creator info', id, error.message);
		}
	}
	return collected;
}

function normalizeContent(body) {
	if (!body) {
		return [];
	}
	if (Array.isArray(body)) {
		return body;
	}
	if (body && Array.isArray(body.items)) {
		return body.items;
	}
	if (body && Array.isArray(body.posts)) {
		return body.posts;
	}
	if (body && Array.isArray(body.videos)) {
		return body.videos;
	}
	return [];
}

function extractSourcesFromBody(body) {
	const sources = [];
	if (!body) {
		return sources;
	}

	const pushSource = (url, quality, type) => {
		if (!url) {
			return;
		}
		let inferredType = type;
		if (!inferredType) {
			if (url.indexOf('.m3u8') !== -1) {
				inferredType = 'application/x-mpegURL';
			} else if (url.indexOf('.mpd') !== -1) {
				inferredType = 'application/dash+xml';
			} else {
				inferredType = 'video/mp4';
			}
		}
		sources.push({
			url,
			quality: quality || null,
			type: inferredType
		});
	};

	if (body.cdns) {
		Object.keys(body.cdns).forEach((key) => {
			const cdn = body.cdns[key];
			if (!cdn) {
				return;
			}
			const items = cdn.items || cdn.flavors || cdn.streams || [];
			items.forEach((item) => {
				if (item && item.url) {
					pushSource(item.url, item.quality || item.name || cdn.name, item.mimeType || item.type);
				}
				if (item && Array.isArray(item.sources)) {
					item.sources.forEach((source) => {
						if (source) {
							pushSource(source.url, source.quality, source.mimeType || source.type);
						}
					});
				}
				if (item && item.playlist) {
					pushSource(item.playlist, item.quality || 'playlist', item.mimeType || item.type);
				}
			});
		});
	}

	if (Array.isArray(body.items)) {
		body.items.forEach((item) => {
			if (item && item.url) {
				pushSource(item.url, item.quality || item.name, item.mimeType || item.type);
			}
			if (item && Array.isArray(item.sources)) {
				item.sources.forEach((source) => {
					if (source) {
						pushSource(source.url, source.quality, source.mimeType || source.type);
					}
				});
			}
		});
	}

	if (Array.isArray(body.groups)) {
		body.groups.forEach((group) => {
			const origin =
				group && Array.isArray(group.origins) && group.origins.length ? group.origins[0].url || '' : '';
			if (Array.isArray(group.variants)) {
				group.variants.forEach((variant) => {
					const variantUrl =
						variant && variant.url ? (origin ? origin + variant.url : variant.url) : null;
					if (variantUrl) {
						pushSource(variantUrl, variant && (variant.label || variant.name), variant && variant.mimeType);
					}
				});
			}
		});
	}

	if (body.url) {
		pushSource(body.url, body.quality, body.type);
	}
	if (Array.isArray(body.sources)) {
		body.sources.forEach((source) => {
			if (source) {
				pushSource(source.url, source.quality, source.mimeType || source.type);
			}
		});
	}

	return sources;
}

function extractAttachmentIdFromList(list) {
	if (!list || !list.length) {
		return null;
	}
	const first = list[0];
	if (!first) {
		return null;
	}
	if (typeof first === 'string') {
		return first;
	}
	return first.id || first.guid || first.attachmentId || first.attachment || null;
}

service.register('status', (message) => {
	const hasSession = !!(sessionState && sessionState.cookieHeader);
	respondSuccess(message, {
		statusCode: 200,
		session: sessionState || null,
		loggedIn: hasSession
	});
});

service.register('login', async (message) => {
	const payload = message.payload || {};
	const username = payload.username;
	const password = payload.password;
	if (!username || !password) {
		respondError(message, 'username and password are required', 400);
		return;
	}

	try {
		const response = await performRequest('POST', '/api/v2/auth/login', {payload: {username, password}});
		if (response.statusCode >= 400) {
			const responseMsg = response.body && response.body.message ? response.body.message : 'Login failed';
			logDebug('login_failed', {statusCode: response.statusCode, body: response.body});
			respondError(message, responseMsg, response.statusCode, {body: response.body});
			return;
		}
		const updatedSession = updateSession({
			cookies: response.cookies,
			user: response.body && response.body.user ? response.body.user : {email: username}
		});
		respondSuccess(message, {
			statusCode: response.statusCode,
			body: response.body,
			cookies: response.cookies,
			cookieHeader: updatedSession.cookieHeader,
			session: updatedSession
		});
	} catch (error) {
		respondError(message, error.message || 'Login request failed');
	}
});

service.register('factor', async (message) => {
	const payload = message.payload || {};
	const token = payload.token;
	const cookies = Array.isArray(payload.cookies) ? payload.cookies : [];
	const cookieHeader = payload.cookieHeader;
	if (!token) {
		respondError(message, 'token is required', 400);
		return;
	}

	try {
		const response = await performRequest('POST', '/api/v2/auth/checkFor2faLogin', {
			payload: {token},
			cookies: cookies.length ? cookies : cookieHeader ? [cookieHeader] : undefined
		});
		if (response.statusCode >= 400) {
			const responseMsg =
				response.body && response.body.message ? response.body.message : 'Two-factor verification failed';
			logDebug('two_factor_failed', {statusCode: response.statusCode, body: response.body});
			respondError(message, responseMsg, response.statusCode, {body: response.body});
			return;
		}
		const updatedSession = updateSession({
			cookies: response.cookies.length ? response.cookies : cookies,
			user: response.body && response.body.user ? response.body.user : sessionState.user
		});
		respondSuccess(message, {
			statusCode: response.statusCode,
			body: response.body,
			cookies: response.cookies,
			cookieHeader: updatedSession.cookieHeader,
			session: updatedSession
		});
	} catch (error) {
		respondError(message, error.message || 'Two-factor request failed');
	}
});

service.register('logout', (message) => {
	persistSession({});
	respondSuccess(message, {statusCode: 200, session: null});
});

service.register('subscriptions', async (message) => {
	const payload = message.payload || {};
	const cookieHeader = ensureAuth(message, payload);
	if (!cookieHeader) {
		return;
	}
	try {
		let querySuffix = '';
		if (!(payload.hasOwnProperty('active') && payload.active === false)) {
			querySuffix = '?active=true';
		}
		logDebug('subscriptions_request', {querySuffix});
		const response = await performRequest('GET', '/api/v3/user/subscriptions' + querySuffix);
		if (response.cookies && response.cookies.length) {
			applySetCookieCookies(response.cookies);
		}
		const subscriptions = normalizeSubscriptions(response.body);
		const creatorIds = subscriptions.map((entry) => getCreatorIdFromSubscription(entry)).filter(Boolean);
		const creators = await fetchCreatorDetails(creatorIds);
		logDebug('subscriptions_result', {
			subscriptionsCount: subscriptions.length,
			creatorIds,
			creatorsCount: creators.length
		});
		respondSuccess(message, {
			statusCode: response.statusCode,
			body: {
				subscriptions,
				creators
			},
			cookieHeader: sessionState ? sessionState.cookieHeader : null
		});
	} catch (error) {
		respondError(message, error.message || 'Failed to load subscriptions');
	}
});

service.register('creatorContent', async (message) => {
	const payload = message.payload || {};
	const creatorId = payload.creatorId;
	const cookieHeader = ensureAuth(message, payload);
	if (!cookieHeader) {
		return;
	}
	if (!creatorId) {
		respondError(message, 'creatorId is required', 400);
		return;
	}
	const limit = typeof payload.limit === 'number' ? Math.min(Math.max(payload.limit, 1), 20) : 20;
	const hasFetchAfter = Object.prototype.hasOwnProperty.call(payload, 'fetchAfter');
	const fetchAfterValue = hasFetchAfter ? payload.fetchAfter : undefined;
	const searchParams = ['id=' + encodeURIComponent(creatorId), 'limit=' + limit];
	if (!(payload.hasOwnProperty('hasVideo') && payload.hasVideo === false)) {
		searchParams.push('hasVideo=true');
	}
	if (payload.hasOwnProperty('hasAudio')) {
		searchParams.push('hasAudio=' + Boolean(payload.hasAudio));
	}
	if (payload.hasOwnProperty('hasPicture')) {
		searchParams.push('hasPicture=' + Boolean(payload.hasPicture));
	}
	if (payload.hasOwnProperty('hasText')) {
		searchParams.push('hasText=' + Boolean(payload.hasText));
	}
	if (payload.hasOwnProperty('fromDate')) {
		searchParams.push('fromDate=' + encodeURIComponent(payload.fromDate));
	}
	if (payload.hasOwnProperty('toDate')) {
		searchParams.push('toDate=' + encodeURIComponent(payload.toDate));
	}
	if (payload.hasOwnProperty('channel')) {
		searchParams.push('channel=' + encodeURIComponent(payload.channel));
	}
	if (payload.hasOwnProperty('sort')) {
		searchParams.push('sort=' + encodeURIComponent(payload.sort));
	}
	if (payload.hasOwnProperty('search') && payload.search) {
		searchParams.push('search=' + encodeURIComponent(payload.search));
	}
	if (payload.tags && Array.isArray(payload.tags)) {
		payload.tags.forEach((tag, tagIndex) => {
			searchParams.push('tags[' + tagIndex + ']=' + encodeURIComponent(tag));
		});
	}
	if (typeof fetchAfterValue === 'number') {
		if (fetchAfterValue > 0) {
			searchParams.push('fetchAfter=' + encodeURIComponent(fetchAfterValue));
		}
	} else if (fetchAfterValue !== undefined && fetchAfterValue !== null && String(fetchAfterValue) !== '') {
		searchParams.push('fetchAfter=' + encodeURIComponent(fetchAfterValue));
	}
	const query = searchParams.join('&');
	try {
		logDebug('creator_content_request', {
			creatorId,
			limit,
			fetchAfter: fetchAfterValue,
			search: payload.search,
			channel: payload.channel,
			hasVideo: payload.hasOwnProperty('hasVideo') ? payload.hasVideo : true
		});
		const response = await performRequest('GET', '/api/v3/content/creator?' + query);
		if (response.cookies && response.cookies.length) {
			applySetCookieCookies(response.cookies);
		}
		const body = response.body || {};
		const pageInfo = body.pageInfo || body.page || body.paging || null;
		const nextCursorCandidates = [
			body.nextCursor,
			body.next,
			pageInfo && (pageInfo.next || pageInfo.cursor || pageInfo.after)
		];
		let nextCursor = null;
		for (let i = 0; i < nextCursorCandidates.length; i += 1) {
			const candidate = nextCursorCandidates[i];
			if (candidate !== undefined && candidate !== null && String(candidate) !== '') {
				nextCursor = candidate;
				break;
			}
		}
		let hasMore;
		if (body && Object.prototype.hasOwnProperty.call(body, 'hasMore')) {
			hasMore = body.hasMore;
		} else if (pageInfo) {
			if (Object.prototype.hasOwnProperty.call(pageInfo, 'hasMore')) {
				hasMore = pageInfo.hasMore;
			} else if (Object.prototype.hasOwnProperty.call(pageInfo, 'more')) {
				hasMore = pageInfo.more;
			} else if (Object.prototype.hasOwnProperty.call(pageInfo, 'hasNext')) {
				hasMore = pageInfo.hasNext;
			}
		}
		if (typeof hasMore === 'undefined' && nextCursor) {
			hasMore = true;
		}
		logDebug('creator_content_result', {
			statusCode: response.statusCode,
			bodyType: typeof response.body,
			isArray: Array.isArray(response.body),
			length: Array.isArray(response.body) ? response.body.length : undefined,
			keys: response.body && typeof response.body === 'object' && !Array.isArray(response.body) ? Object.keys(response.body) : undefined,
			nextCursor,
			hasMore
		});
		respondSuccess(message, {
			statusCode: response.statusCode,
			body: {
				items: normalizeContent(response.body),
				pageInfo,
				nextCursor,
				hasMore
			},
			cookieHeader: sessionState ? sessionState.cookieHeader : null
		});
	} catch (error) {
		respondError(message, error.message || 'Failed to load creator content');
	}
});

service.register('videoDelivery', async (message) => {
	const payload = message.payload || {};
	let attachmentId = payload.attachmentId;
	const videoId = payload.videoId;
	const cookieHeader = ensureAuth(message, payload);
	if (!cookieHeader) {
		return;
	}

	try {
		if (!attachmentId) {
			if (!videoId) {
				respondError(message, 'attachmentId or videoId is required', 400);
				return;
			}
			const videoResponse = await performRequest('GET', '/api/v3/content/video?id=' + encodeURIComponent(videoId));
			if (videoResponse.statusCode >= 400 || !videoResponse.body) {
				respondError(
					message,
					'Unable to resolve video attachment',
					videoResponse.statusCode || 500,
					{body: videoResponse.body}
				);
				return;
			}
			if (videoResponse.cookies && videoResponse.cookies.length) {
				applySetCookieCookies(videoResponse.cookies);
			}
			const attachments = videoResponse.body && videoResponse.body.attachments ? videoResponse.body.attachments : [];
			attachmentId = extractAttachmentIdFromList(attachments);
			if (!attachmentId) {
				respondError(message, 'Video attachment not found', 404, {body: videoResponse.body});
				return;
			}
		}

		const allowedScenarios = ['download', 'live', 'onDemand'];
		let scenario = payload && typeof payload.scenario === 'string' ? payload.scenario.trim() : '';
		if (!allowedScenarios.includes(scenario)) {
			scenario = payload && payload.isLive ? 'live' : 'download';
		}

		const preference = [];
		if (scenario === 'live') {
			preference.push('live', 'onDemand', 'download');
		} else {
			preference.push(scenario, 'download', 'onDemand', 'live');
		}
		const tried = new Set();
		let deliveryResponse = null;
		let sources = [];
		let usedScenario = null;

		for (let i = 0; i < preference.length; i += 1) {
			const candidate = preference[i];
			if (tried.has(candidate)) {
				continue;
			}
			tried.add(candidate);
			const deliveryQuery = [
				'entityId=' + encodeURIComponent(attachmentId),
				'scenario=' + encodeURIComponent(candidate)
			].join('&');
			try {
				const response = await performRequest('GET', '/api/v3/delivery/info?' + deliveryQuery);
				if (response.cookies && response.cookies.length) {
					applySetCookieCookies(response.cookies);
				}
				const extracted = extractSourcesFromBody(response.body);
				if (extracted && extracted.length) {
					deliveryResponse = response;
					sources = extracted;
					usedScenario = candidate;
					break;
				}
				if (!deliveryResponse) {
					deliveryResponse = response;
				}
			} catch (attemptError) {
				if (!deliveryResponse) {
					deliveryResponse = {
						statusCode: attemptError.statusCode || 500,
						body: {message: attemptError.message}
					};
				}
			}
		}

		if (!deliveryResponse) {
			throw new Error('Delivery request failed');
		}

		logDebug('video_delivery_result', {
			attachmentId,
			videoId,
			sourceCount: sources.length,
			scenarioAttempted: scenario,
			scenarioUsed: usedScenario
		});
		respondSuccess(message, {
			statusCode: deliveryResponse.statusCode,
			body: {
				sources,
				scenario: usedScenario || scenario
			},
			cookieHeader: sessionState ? sessionState.cookieHeader : null
		});
	} catch (error) {
		respondError(message, error.message || 'Video delivery failed');
	}
});

service.register('creatorInfo', async (message) => {
	const payload = message.payload || {};
	const creatorId = payload.creatorId;
	const cookieHeader = ensureAuth(message, payload);
	if (!cookieHeader) {
		return;
	}
	if (!creatorId) {
		respondError(message, 'creatorId is required', 400);
		return;
	}
	try {
		const response = await performRequest('GET', '/api/v3/creator/info?id=' + encodeURIComponent(creatorId));
		if (response.cookies && response.cookies.length) {
			applySetCookieCookies(response.cookies);
		}
		respondSuccess(message, {
			statusCode: response.statusCode,
			body: response.body || {},
			cookieHeader: sessionState ? sessionState.cookieHeader : null
		});
	} catch (error) {
		respondError(message, error.message || 'Failed to load creator info');
	}
});

module.exports = service;
