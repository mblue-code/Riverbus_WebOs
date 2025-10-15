import {Component, createRef} from 'react';
import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator';
import Panels from '@enact/moonstone/Panels';
import Panel from '@enact/moonstone/Panels/Panel';
import Header from '@enact/moonstone/Panels/Header';
import BodyText from '@enact/moonstone/BodyText';
import Button from '@enact/moonstone/Button';
import Item from '@enact/moonstone/Item';
import Heading from '@enact/moonstone/Heading';
import Spinner from '@enact/moonstone/Spinner';
import Input from '@enact/moonstone/Input';
import Scroller from '@enact/moonstone/Scroller';
import Spottable from '@enact/spotlight/Spottable';
import Spotlight from '@enact/spotlight';
import {VirtualGridList} from '@enact/moonstone/VirtualList';
import LS2Request from '@enact/webos/LS2Request';
import LoginForm from '../components/LoginForm';

const SERVICE_ID = 'luna://com.community.floatplane.enactmvp.login';
const VIDEO_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 500;
const HERO_FALLBACK_COLOR = '#1c1c1e';

const FocusableCard = Spottable('div');

const createInitialState = () => ({
	user: null,
	cookieHeader: null,
	sessionCookies: [],
	creators: [],
	selectedCreatorIndex: -1,
	selectedCreator: null,
	creatorDetails: null,
	videos: [],
	selectedVideoIndex: -1,
	selectedVideo: null,
	availableSources: [],
	selectedQuality: null,
	videoSource: null,
	videoNextCursor: 0,
	hasMoreVideos: true,
	channels: [],
	selectedChannelId: null,
	view: 'home',
	searchTerm: '',
	searchAppliedTerm: '',
	searchTimer: null,
	loadingCreators: false,
	loadingVideos: false,
	videoLoading: false,
	infoMessage: null,
	errorMessage: null,
	playerError: null,
	showPlayer: false,
	showCreatorPicker: false,
	liveStream: null,
	liveReplay: null,
	liveStatusMessage: null
});

const cookiesToHeader = (cookies = []) =>
	(Array.isArray(cookies) ? cookies : [])
		.map((cookie) => (cookie || '').split(';')[0])
		.filter(Boolean)
		.join('; ');

const ls2Call = (method, parameters) =>
	new Promise((resolve, reject) => {
		const request = new LS2Request();
		request.send({
			service: SERVICE_ID,
			method,
			parameters,
			onSuccess: (response) => {
				if (response && response.returnValue === false) {
					reject(new Error(response.errorText || 'Service returned an error'));
					return;
				}
				resolve(response);
			},
			onFailure: (error) =>
				reject(new Error(error && (error.errorText || error.message) ? error.errorText || error.message : 'LS2 request failed'))
		});
	});

const extractCreatorId = (entry) => {
	if (!entry) {
		return null;
	}
	if (typeof entry === 'string') {
		return entry;
	}
	const creator = entry.creator || entry;
	if (!creator) {
		return null;
	}
	if (typeof creator === 'string') {
		return creator;
	}
	return (
		creator.id ||
		creator.slug ||
		creator.handle ||
		creator.guid ||
		entry.creatorId ||
		entry.id ||
		null
	);
};

const normalizeCreator = (entry, creatorLookup) => {
	const creatorId = extractCreatorId(entry);
	const explicitCreator = creatorId && creatorLookup ? creatorLookup.get(creatorId) : null;
	const base = explicitCreator || (entry && entry.creator) || entry || {};
	const plan = entry && entry.plan ? entry.plan : null;

	return {
		id: base.id || creatorId || base.slug || base.handle || base.guid || null,
		name:
			base.name ||
			base.title ||
			base.displayName ||
			base.slug ||
			(plan && (plan.title || plan.description)) ||
			'Unknown creator',
		summary: base.summary || base.description || base.tagline || (plan && plan.description) || '',
		slug: base.slug || base.handle || null,
		avatar:
			base.avatarUrl ||
			(base.profileImage && base.profileImage.path) ||
			(base.images && base.images.length ? base.images[0].url : null),
		raw: base,
		subscription: entry || base,
		plan
	};
};

const selectThumbnailPath = (thumbnail) => {
	if (!thumbnail) {
		return null;
	}
	if (typeof thumbnail === 'string') {
		return thumbnail;
	}
	if (thumbnail.path) {
		return thumbnail.path;
	}
	if (Array.isArray(thumbnail.childImages) && thumbnail.childImages.length) {
		const preferred = thumbnail.childImages.find((image) => image.width >= 400) || thumbnail.childImages[0];
		return preferred && preferred.path ? preferred.path : null;
	}
	return null;
};

const extractAttachmentId = (attachments) => {
	if (!attachments || !attachments.length) {
		return null;
	}
	const first = attachments[0];
	if (!first) {
	 return null;
	}
	if (typeof first === 'string') {
		return first;
	}
	return first.id || first.guid || first.attachmentId || first.attachment || null;
};

const normalizeVideo = (item = {}, creator = null) => {
	const videoAttachments = Array.isArray(item.videoAttachments) ? item.videoAttachments : [];
	const thumbnailPath =
		selectThumbnailPath(item.thumbnail) ||
		selectThumbnailPath(item.thumbnailUrl) ||
		(Array.isArray(item.thumbnails) && item.thumbnails.length ? selectThumbnailPath(item.thumbnails[0]) : null);
	const channel = item.channel || null;
	const attachmentId = extractAttachmentId(videoAttachments);
	const metadata = item.metadata || item.rawMetadata || {};
	const hasVideoAttachment =
		Boolean(attachmentId) ||
		(Array.isArray(videoAttachments) && videoAttachments.length > 0) ||
		Boolean(
			item.attachments &&
			item.attachments.some(
				(attachment) =>
					attachment &&
					attachment.type &&
					String(attachment.type).toLowerCase().includes('video') &&
					(attachment.url || (attachment.sources && attachment.sources.length))
			)
		);
	const isPlayable = Boolean(
		hasVideoAttachment ||
		item.hasVideo ||
		item.isVideo ||
		item.type === 'video' ||
		(metadata && (metadata.hasVideo || metadata.videoCount > 0))
	);
	return {
		id: item.id || item.guid || item.slug || null,
		title: item.title || item.name || item.heading || 'Untitled post',
		description: item.description || item.summary || item.excerpt || '',
		publishedAt: item.publishedAt || item.releaseDate || item.createdAt || item.updatedAt || null,
		duration: item.duration || item.length || item.videoDuration || metadata.videoDuration || null,
		isLive:
			Boolean(
				item.isLive ||
					item.isLivestream ||
					item.live ||
					(metadata && metadata.isLivestream) ||
					(item.type && String(item.type).toLowerCase().includes('live'))
			),
		viewerCount: item.viewerCount || item.viewers || metadata.viewerCount || null,
		thumbnail: thumbnailPath,
		channel: channel
			? {
					id: channel.id || channel.slug || channel.handle || channel.urlname || null,
					title: channel.title || channel.name || channel.slug || null
			  }
			: null,
		attachmentId,
		videoAttachments,
		sources: item.sources || [],
		attachments: item.attachments || [],
		raw: item,
		creatorId: (creator && creator.id) || extractCreatorId(channel) || null,
		tags: item.tags || metadata.tags || [],
		isPlayable
	};
};

const findFirstPlayableVideo = (videos = []) => videos.find((video) => video && video.isPlayable) || videos[0] || null;

const guessMimeType = (url) => {
	if (!url) {
		return 'video/mp4';
	}
	if (url.includes('.m3u8')) {
		return 'application/x-mpegURL';
	}
	if (url.includes('.mpd')) {
		return 'application/dash+xml';
	}
	if (url.includes('.mp4')) {
		return 'video/mp4';
	}
	return 'video/mp4';
};

const normalizeSources = (sources = [], video = null) => {
	const collected = [];
	const push = (source) => {
		if (!source || !source.url) {
			return;
		}
		collected.push({
			url: source.url,
			quality: source.quality || source.label || source.name || null,
			type: source.type || source.mimeType || guessMimeType(source.url)
		});
	};

	sources.forEach(push);

	if (video) {
		if (Array.isArray(video.sources)) {
			video.sources.forEach(push);
		}
		if (Array.isArray(video.attachments)) {
			video.attachments.forEach((attachment) => {
				if (!attachment) {
					return;
				}
				if (attachment.url) {
					push({url: attachment.url, quality: attachment.quality || null, type: attachment.type});
				}
				if (attachment.sources) {
					attachment.sources.forEach(push);
				}
				if (attachment.data && attachment.data.source) {
					push(attachment.data.source);
				}
				if (attachment.data && attachment.data.sources) {
					attachment.data.sources.forEach(push);
				}
			});
		}
	}

	return collected;
};

const pickPreferredSource = (sources = []) => {
	if (!sources.length) {
		return null;
	}
	const autoSource = sources.find((item) => item.quality && item.quality.toLowerCase().includes('auto'));
	if (autoSource) {
		return autoSource;
	}
	const sorted = [...sources].sort((a, b) => {
		const extractHeight = (quality) => {
			if (!quality) {
				return 0;
			}
			const match = String(quality).match(/(\d{3,4})p/i);
			return match ? parseInt(match[1], 10) : 0;
		};
		return extractHeight(b.quality) - extractHeight(a.quality);
	});
	return sorted[0] || sources[0];
};

const formatDateTime = (value) => {
	if (!value) {
		return '';
	}
	try {
		const date = new Date(value);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch (error) {
		return value;
	}
};

const formatDuration = (seconds) => {
	if ((!seconds && seconds !== 0) || Number.isNaN(Number(seconds))) {
		return '';
	}
	const total = Math.max(0, Math.floor(Number(seconds)));
	const hrs = Math.floor(total / 3600);
	const mins = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

class AppBase extends Component {
	state = createInitialState();

	videoRef = createRef();
	videoEventHandlers = [];
	focusTimeout = null;
	playerFocusTimeout = null;
	globalKeyHandler = null;
	playerBackButtonNode = null;
	constructor(props) {
		super(props);
		this.renderVideoItem = this.renderVideoItem.bind(this);
	}

	safeSetContainerDefault = (containerId, elementId) => {
		try {
			Spotlight.setContainerDefault(containerId, elementId);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn('[Floatplane] Spotlight.setContainerDefault failed', containerId, elementId, error);
		}
	};

	componentDidMount() {
		this.bootstrapSession();
		this.attachVideoListeners();
		this.safeSetContainerDefault('sideNav', 'nav-item-home');
		this.safeSetContainerDefault('videoGridContainer', 'videoCard-0');
		this.globalKeyHandler = (event) => this.handleGlobalKeyDown(event);
		if (typeof document !== 'undefined') {
			document.addEventListener('keydown', this.globalKeyHandler, true);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		const sourceChanged =
			this.state.videoSource !== prevState.videoSource ||
			this.state.selectedQuality !== prevState.selectedQuality;
		const toggledPlayer = this.state.showPlayer && !prevState.showPlayer;
		if ((sourceChanged || toggledPlayer) && this.state.showPlayer) {
			this.attachVideoListeners();
			this.triggerVideoPlayback();
			this.focusPlayerControls();
		}
		const channelsChanged = prevState.channels !== this.state.channels || prevState.channels.length !== this.state.channels.length;
		if (channelsChanged) {
			this.safeSetContainerDefault('sideNav', 'nav-item-home');
		}
		if (prevState.view !== this.state.view && !this.state.showPlayer) {
			this.safeSetContainerDefault('sideNav', 'nav-item-home');
			this.queueFocusFirstVideo();
		}
		if (prevState.showPlayer && !this.state.showPlayer) {
			this.queueFocusFirstVideo();
		}
		if (prevState.selectedChannelId !== this.state.selectedChannelId && !this.state.showPlayer) {
			this.queueFocusFirstVideo();
		}
		if (prevState.searchAppliedTerm !== this.state.searchAppliedTerm && !this.state.showPlayer) {
			this.queueFocusFirstVideo();
		}
		if (prevState.videos !== this.state.videos) {
			this.safeSetContainerDefault('videoGridContainer', 'videoCard-0');
			if (this.state.videos.length && !this.state.showPlayer) {
				this.queueFocusFirstVideo();
			}
		}
	}

	componentWillUnmount() {
		this.detachVideoListeners();
		if (this.state.searchTimer) {
			clearTimeout(this.state.searchTimer);
		}
		if (this.focusTimeout) {
			clearTimeout(this.focusTimeout);
			this.focusTimeout = null;
		}
		if (this.playerFocusTimeout) {
			clearTimeout(this.playerFocusTimeout);
			this.playerFocusTimeout = null;
		}
		if (this.globalKeyHandler && typeof document !== 'undefined') {
			document.removeEventListener('keydown', this.globalKeyHandler, true);
			this.globalKeyHandler = null;
		}
	}

	attachVideoListeners() {
		this.detachVideoListeners();
		const element = this.videoRef.current;
		if (!element) {
			return;
		}
		const listeners = [
			[
				'error',
				(event) => {
					const mediaError = event && event.target && event.target.error ? event.target.error : null;
					if (mediaError) {
						this.setAppState({
							playerError: `Playback error (${mediaError.code || 0})`,
							infoMessage: null
						});
					}
				}
			],
			['loadedmetadata', () => this.setAppState({playerError: null, infoMessage: null})],
			['stalled', () => this.setAppState({infoMessage: 'Video stalled…'})],
			['waiting', () => this.setAppState({infoMessage: 'Buffering stream…'})]
		];
		listeners.forEach(([type, handler]) => element.addEventListener(type, handler));
		this.videoEventHandlers = listeners;
	}

	detachVideoListeners() {
		const element = this.videoRef.current;
		if (!element || !this.videoEventHandlers.length) {
			return;
		}
		this.videoEventHandlers.forEach(([type, handler]) => element.removeEventListener(type, handler));
		this.videoEventHandlers = [];
	}

	setAppState(nextState, callback) {
		this.setState((prev) => Object.assign({}, prev, nextState), callback);
	}

	async bootstrapSession() {
		try {
			const response = await ls2Call('status');
			if (!response || response.returnValue === false) {
				return;
			}
			const session = response.session || {};
			if (session && session.cookieHeader) {
				this.setAppState({
					user: session.user || null,
					cookieHeader: session.cookieHeader,
					sessionCookies: session.cookies || [],
					infoMessage: 'Restored previous session.'
				});
				this.fetchSubscriptions();
			}
		} catch (error) {
			this.setAppState({errorMessage: error.message || 'Unable to restore session.'});
		}
	}

	handleLoginSuccess = (response) => {
		const session = (response && response.session) || {};
		const cookies = session.cookies || (response && response.cookies ? response.cookies : []);
		const cookieHeader =
			response && response.cookieHeader ? response.cookieHeader : cookiesToHeader(cookies);
		const user =
			session.user ||
			(response && response.body && response.body.user ? response.body.user : response && response.body
				? response.body
				: {email: 'unknown'});

		this.setAppState({
			user,
			cookieHeader,
			sessionCookies: cookies,
			infoMessage: 'Login successful. Loading subscriptions…',
			errorMessage: null
		});
		this.fetchSubscriptions();
	};

	handleLogout = async () => {
		try {
			await ls2Call('logout');
		} catch (error) {
			// ignore logout errors; session will be cleared locally
		}
		this.setState(createInitialState());
	};

	async fetchSubscriptions() {
		this.setAppState({
			loadingCreators: true,
			errorMessage: null,
			infoMessage: 'Syncing subscriptions…'
		});
		try {
			const response = await ls2Call('subscriptions');
			const subscriptions =
				response && response.body && Array.isArray(response.body.subscriptions)
					? response.body.subscriptions
					: [];
			const creatorDetails =
				response && response.body && Array.isArray(response.body.creators)
					? response.body.creators
					: [];
			const creatorLookup = new Map();
			creatorDetails.forEach((creator) => {
				const id = extractCreatorId(creator);
				if (id) {
					creatorLookup.set(id, creator);
				}
			});
			const creators = subscriptions
				.map((entry) => normalizeCreator(entry, creatorLookup))
				.filter((creator) => creator.id);
			const nextState = {
				creators,
				selectedCreatorIndex: creators.length ? 0 : -1,
				selectedCreator: creators.length ? creators[0] : null,
				infoMessage: creators.length ? 'Subscriptions loaded.' : 'No subscriptions found.'
			};
			this.setAppState(nextState);
			if (creators.length) {
				this.initializeCreator(creators[0], 0);
			}
		} catch (error) {
			this.setAppState({
				errorMessage: error.message || 'Unable to load subscriptions.',
				infoMessage: null
			});
		} finally {
			this.setAppState({loadingCreators: false});
		}
	}

	initializeCreator = async (creator, index) => {
		await this.fetchCreatorProfile(creator);
		this.fetchCreatorContent(creator, index);
	};

	openCreatorPicker = () => {
		this.setAppState({showCreatorPicker: true}, () => {
			const {creators} = this.state;
			if (!creators || !creators.length) {
				return;
			}
			try {
				if (Spotlight.getPointerMode && Spotlight.getPointerMode()) {
					Spotlight.setPointerMode(false);
				}
				if (Spotlight.isPaused && Spotlight.isPaused()) {
					Spotlight.resume();
				}
				if (Spotlight.setContainerDefault) {
					Spotlight.setContainerDefault('creatorPickerOverlay', 'creatorPickerItem-0');
				}
				if (Spotlight.setActiveContainer) {
					Spotlight.setActiveContainer('creatorPickerOverlay');
				}
			} catch (error) {
				// ignore spotlight errors
			}
			this.focusSpotlightTarget('creatorPickerItem-0', '[data-spotlight-id="creatorPickerItem-0"], [data-index="0"]');
		});
	};

	closeCreatorPicker = ({focusTarget = 'switchCreatorButton'} = {}) => {
		this.setAppState({showCreatorPicker: false}, () => {
			try {
				if (Spotlight.getPointerMode && Spotlight.getPointerMode()) {
					Spotlight.setPointerMode(false);
				}
				if (Spotlight.isPaused && Spotlight.isPaused()) {
					Spotlight.resume();
				}
			} catch (error) {
				// ignore spotlight errors
			}
			if (focusTarget) {
				this.focusSpotlightTarget(focusTarget);
			}
		});
	};

	handleCreatorSelect = (index) => {
		const {creators} = this.state;
		if (index < 0 || index >= creators.length) {
			return;
		}
		const creator = creators[index];
		this.initializeCreator(creator, index);
		this.closeCreatorPicker();
	};

	handleCreatorActivate = (event) => {
		const index = Number(
			event && event.currentTarget && event.currentTarget.dataset
				? event.currentTarget.dataset.index
				: -1
		);
		if (!Number.isNaN(index)) {
			this.handleCreatorSelect(index);
		}
	};

	handleSearchChange = (ev) => {
		const value = ev && ev.value ? ev.value : '';
		if (this.state.searchTimer) {
			clearTimeout(this.state.searchTimer);
		}
		const timer = setTimeout(() => {
			this.applySearchTerm(value);
		}, SEARCH_DEBOUNCE_MS);
		this.setAppState({searchTerm: value, searchTimer: timer});
	};

	clearSearch = () => {
		if (this.state.searchTimer) {
			clearTimeout(this.state.searchTimer);
		}
		this.setAppState({searchTerm: '', searchTimer: null});
		this.applySearchTerm('');
	};

	applySearchTerm = (term) => {
		const {selectedCreator, selectedCreatorIndex} = this.state;
		if (!selectedCreator) {
			return;
		}
		this.setAppState({
			searchAppliedTerm: term || '',
			searchTimer: null
		});
		this.fetchCreatorContent(selectedCreator, selectedCreatorIndex, {searchTerm: term || '', append: false});
	};

	setView = (view) => {
		this.setAppState({view});
	};

	async fetchCreatorProfile(creator) {
		if (!creator || !creator.id) {
			return;
		}
		try {
			const response = await ls2Call('creatorInfo', {creatorId: creator.id});
			const details = response && response.body ? response.body : null;
			let liveStream = null;
			let liveStatusMessage = null;
			if (details && details.liveStream) {
				liveStream = details.liveStream;
				liveStatusMessage = details.liveStream && details.liveStream.state
					? `Live status: ${details.liveStream.state}`
					: null;
			}
			this.setAppState({
				creatorDetails: details || null,
				liveStream: liveStream || null,
				liveStatusMessage
			});
		} catch (error) {
			this.setAppState({creatorDetails: null});
		}
	}

	async fetchCreatorContent(creator, index, options = {}) {
		const {append = false, searchTerm: overrideSearch} = options;
		if (!creator || !creator.id) {
			return;
		}

		if (this.state.loadingVideos) {
			return;
		}

		const fetchAfter = append ? this.state.videoNextCursor : null;
		const searchTerm =
			overrideSearch !== undefined ? overrideSearch : this.state.searchAppliedTerm || this.state.searchTerm;

		if (!append) {
			this.setState((prev) =>
				Object.assign({}, prev, {
					selectedCreatorIndex: index,
					selectedCreator: creator,
					loadingVideos: true,
					errorMessage: null,
					infoMessage: `Loading videos for ${creator.name}…`,
					selectedVideoIndex: -1,
					selectedVideo: null,
					videos: [],
					videoSource: null,
					availableSources: [],
					selectedQuality: null,
					playerError: null,
					videoNextCursor: 0,
					hasMoreVideos: true,
					channels: [],
					selectedChannelId: null
				})
			);
		} else {
			this.setAppState({
				loadingVideos: true,
				errorMessage: null,
				infoMessage: searchTerm ? `Searching "${searchTerm}"…` : 'Loading more videos…'
			});
		}

		try {
			const requestPayload = {
				creatorId: creator.id,
				limit: VIDEO_PAGE_SIZE
			};
			if (
				append &&
				((typeof fetchAfter === 'number' && fetchAfter > 0) ||
					(typeof fetchAfter === 'string' && fetchAfter !== ''))
			) {
				requestPayload.fetchAfter = fetchAfter;
			}
			if (searchTerm) {
				requestPayload.search = searchTerm;
			}
			const response = await ls2Call('creatorContent', requestPayload);
			const responseBody = (response && response.body) || {};
			if (responseBody && (responseBody.errorText || responseBody.errorMessage || responseBody.message)) {
				this.setAppState({
					errorMessage: responseBody.errorText || responseBody.errorMessage || responseBody.message
				});
			}
			const items = Array.isArray(responseBody.items) ? responseBody.items : [];
			const mappedVideos = items.map((item) => normalizeVideo(item, creator)).filter((video) => video.id);
			const pagination = responseBody.pageInfo || responseBody.page || responseBody.paging || null;
			const nextCursorRaw =
				responseBody.nextCursor !== undefined
					? responseBody.nextCursor
					: responseBody.next !== undefined
					? responseBody.next
					: pagination &&
					  (pagination.next !== undefined ? pagination.next : pagination.cursor !== undefined ? pagination.cursor : pagination.after);
			let nextCursor = null;
			if (typeof nextCursorRaw === 'number') {
				nextCursor = nextCursorRaw;
			} else if (typeof nextCursorRaw === 'string' && nextCursorRaw !== '') {
				const parsed = Number(nextCursorRaw);
				nextCursor = Number.isNaN(parsed) ? nextCursorRaw : parsed;
			}
			const explicitHasMore =
				responseBody.hasMore !== undefined
					? responseBody.hasMore
					: pagination && (pagination.hasMore !== undefined ? pagination.hasMore : pagination.more !== undefined ? pagination.more : pagination.hasNext);

			this.setState((prev) => {
				const channelMap = new Map((prev.channels || []).map((channel) => [channel.id, channel]));
				let mergedVideos;
				if (append) {
					const seenIds = new Set((prev.videos || []).map((video) => video.id));
					mergedVideos = [...prev.videos];
					mappedVideos.forEach((video) => {
						if (!seenIds.has(video.id)) {
							mergedVideos.push(video);
							seenIds.add(video.id);
						}
					});
				} else {
					mergedVideos = mappedVideos;
				}

				mergedVideos.forEach((video) => {
					if (video.channel && video.channel.id && !channelMap.has(video.channel.id)) {
						channelMap.set(video.channel.id, {
							id: video.channel.id,
							title: video.channel.title || 'Channel'
						});
					}
				});
			const channels = Array.from(channelMap.values());
			const currentSelectedVideoId = append && prev.selectedVideo ? prev.selectedVideo.id : null;
			const defaultVideo = findFirstPlayableVideo(mergedVideos);
			const nextSelectedVideo =
				append && currentSelectedVideoId
					? mergedVideos.find((video) => video.id === currentSelectedVideoId) || prev.selectedVideo || defaultVideo
					: defaultVideo;
			const nextSelectedIndex = nextSelectedVideo
				? mergedVideos.findIndex((video) => video.id === nextSelectedVideo.id)
				: -1;
				const selectedChannelId =
					prev.selectedChannelId && channelMap.has(prev.selectedChannelId)
						? prev.selectedChannelId
						: null;

				let hasMoreVideos;
				if (typeof explicitHasMore === 'boolean') {
					hasMoreVideos = explicitHasMore;
				} else if (nextCursor !== null && nextCursor !== undefined) {
					hasMoreVideos = Boolean(nextCursor);
				} else {
					hasMoreVideos = mergedVideos.length >= VIDEO_PAGE_SIZE;
				}

				let computedNextCursor = nextCursor;
				if (computedNextCursor === null || computedNextCursor === undefined || computedNextCursor === '') {
					computedNextCursor = mergedVideos.length;
				}

				const liveReplay = mergedVideos.find((video) => video.isLive) || null;

				return {
					videos: mergedVideos,
					selectedVideoIndex: nextSelectedIndex,
					selectedVideo: nextSelectedVideo,
					infoMessage: mergedVideos.length
						? searchTerm
							? `Found ${mergedVideos.length} result${mergedVideos.length === 1 ? '' : 's'}`
							: `Loaded ${mergedVideos.length} videos.`
						: searchTerm
						? 'No results matched your search.'
						: 'No videos available for this creator.',
					searchAppliedTerm: searchTerm || '',
					loadingVideos: false,
					hasMoreVideos,
					videoNextCursor: computedNextCursor,
					channels,
					selectedChannelId,
					liveReplay
				};
			}, () => {
				if (!append) {
					this.queueFocusFirstVideo();
				}
			});
		} catch (error) {
			this.setState({
				errorMessage: error.message || 'Unable to load videos.',
				infoMessage: null,
				loadingVideos: false
			});
		}
	}

	handleVideoSelect = (videoId) => {
		const {videos} = this.state;
		const index = videos.findIndex((entry) => entry.id === videoId);
		if (index === -1) {
			return;
		}
		const videoEntry = videos[index];
		this.setState({
			selectedVideoIndex: index,
			selectedVideo: videoEntry,
			infoMessage: null,
			playerError: null
		});
	};

	handleVideoActivate = (event) => {
		const videoId =
			event && event.currentTarget && event.currentTarget.dataset
				? event.currentTarget.dataset.id
				: null;
		if (videoId) {
			this.playVideoById(videoId);
		}
	};

	playVideoById = (videoId) => {
		const {videos} = this.state;
		const index = videos.findIndex((entry) => entry.id === videoId);
		if (index === -1) {
			return;
		}
		const videoEntry = videos[index];
		this.setState(
			{
				selectedVideoIndex: index,
				selectedVideo: videoEntry,
				infoMessage: null,
				playerError: null
			},
			() => this.handlePlaySelected()
		);
	};

	handlePlaySelected = async () => {
		const {selectedVideo} = this.state;
		if (!selectedVideo || !selectedVideo.id) {
			this.setAppState({playerError: 'Select a video before attempting playback.'});
			return;
		}
		if (!selectedVideo.attachmentId && (!selectedVideo.videoAttachments || !selectedVideo.videoAttachments.length)) {
			this.setAppState({
				playerError: 'This post does not include a playable video.'
			});
			return;
		}

		try {
			await this.ensureVideoSource(selectedVideo);
			this.setAppState({
				showPlayer: true,
				infoMessage: null,
				playerError: null
			});
		} catch (error) {
			this.setAppState({
				playerError: error.message || 'Unable to start playback.'
			});
		}
	};

	handlePlayLiveStream = () => {
		const {liveStream, videos} = this.state;
		if (!liveStream || !liveStream.videoAttachments) {
			return;
		}
		const attachmentId = extractAttachmentId(liveStream.videoAttachments);
		const pseudoVideo = {
			id: liveStream.id || 'live',
			title: liveStream.title || 'Live Stream',
			description: liveStream.description || '',
			attachmentId,
			videoAttachments: liveStream.videoAttachments,
			sources: [],
			attachments: [],
			isLive: true,
			channel: liveStream.channel,
			raw: liveStream
		};
		const existingIndex = videos.findIndex((video) => video.id === pseudoVideo.id);
		if (existingIndex === -1) {
			this.setState((prev) => ({
				videos: [pseudoVideo, ...prev.videos],
				selectedVideo: pseudoVideo,
				selectedVideoIndex: 0,
				infoMessage: 'Opening live stream…'
			}));
		} else {
			this.setState({
				selectedVideo: pseudoVideo,
				selectedVideoIndex: existingIndex,
				infoMessage: 'Opening live stream…'
			});
		}
		this.ensureVideoSource(pseudoVideo)
			.then(() => {
				this.setAppState({
					showPlayer: true,
					playerError: null,
					infoMessage: 'Live stream ready.'
				});
			})
			.catch((error) => {
				this.setAppState({playerError: error.message || 'Unable to start live stream.'});
			});
	};

	handleStopPlayback = () => {
		this.setAppState({
			showPlayer: false
		});
		if (this.videoRef.current) {
			try {
				this.videoRef.current.pause();
			} catch (error) {
				// ignore video pause errors
			}
		}
	};

	setQuality = (quality) => {
		const {availableSources} = this.state;
		if (!availableSources.length) {
			return;
		}
		const nextSource = availableSources.find((source) => {
			if (!quality && !source.quality) {
				return true;
			}
			return (source.quality || '').toLowerCase() === (quality || '').toLowerCase();
		});
		if (nextSource) {
			this.setAppState({
				videoSource: nextSource,
				selectedQuality: nextSource.quality || null
			});
		}
	};

	handleQualityActivate = (event) => {
		const quality =
			event && event.currentTarget && event.currentTarget.dataset
				? event.currentTarget.dataset.quality
				: null;
		this.setQuality(quality || null);
	};

	async ensureVideoSource(video) {
		const {videoSource, selectedVideo} = this.state;
		if (videoSource && selectedVideo && selectedVideo.id === video.id) {
			return videoSource;
		}
		this.setAppState({videoLoading: true, playerError: null});
		try {
			const attachmentId =
				video.attachmentId ||
				(Array.isArray(video.videoAttachments) ? extractAttachmentId(video.videoAttachments) : null);
			if (!attachmentId) {
				throw new Error('Video attachment identifier not available.');
			}
			const isLiveVideo = Boolean(video && video.isLive);
			const deliveryPayload = {
				attachmentId,
				videoId: video.id,
				isLive: isLiveVideo
			};
			if (isLiveVideo) {
				deliveryPayload.scenario = 'live';
			}
			const response = await ls2Call('videoDelivery', deliveryPayload);
			const sources =
				response && response.body && Array.isArray(response.body.sources) ? response.body.sources : [];
			const normalizedSources = normalizeSources(sources, video);
			if (!normalizedSources.length) {
				throw new Error('No playable sources returned for this video.');
			}
			const preferred = pickPreferredSource(normalizedSources);
			this.setAppState({
				availableSources: normalizedSources,
				videoSource: preferred,
				selectedQuality: preferred && preferred.quality ? preferred.quality : null,
				videoLoading: false
			});
			return preferred;
		} catch (error) {
			this.setAppState({
				videoLoading: false,
				playerError: error.message || 'Video delivery failed.'
			});
			throw error;
		}
	}

	triggerVideoPlayback() {
		const element = this.videoRef.current;
		if (!element) {
			return;
		}
		try {
			element.pause();
			element.load();
			const playPromise = element.play();
			if (playPromise && typeof playPromise.catch === 'function') {
				playPromise.catch(() => {
					this.setAppState({
						playerError: 'Playback blocked until you press OK.',
						infoMessage: null
					});
				});
			}
		} catch (error) {
			// ignore playback errors (user interaction required, etc.)
		}
	}

	loadMoreVideos = () => {
		const {loadingVideos, hasMoreVideos, selectedCreator, selectedCreatorIndex} = this.state;
		if (loadingVideos || !selectedCreator) {
			return;
		}
		if (!hasMoreVideos) {
			return;
		}
		this.fetchCreatorContent(selectedCreator, selectedCreatorIndex, {append: true});
	};

	queueFocusFirstVideo = () => {
		if (this.focusTimeout) {
			clearTimeout(this.focusTimeout);
		}
		this.focusTimeout = setTimeout(() => {
			this.focusTimeout = null;
			this.focusFirstVideo();
		}, 0);
	};

	focusFirstVideo = () => {
		if (!this.state.videos.length || this.state.showPlayer) {
			return;
		}
		if (Spotlight.getPointerMode()) {
			Spotlight.setPointerMode(false);
		}
		if (Spotlight.isPaused && Spotlight.isPaused()) {
			Spotlight.resume();
		}
		const containerId = 'videoGridContainer';
		const targetId = 'videoCard-0';
		Spotlight.setContainerDefault(containerId, targetId);
		Spotlight.setActiveContainer(containerId);
		let focused = Spotlight.focus(targetId);
		if (!focused && typeof document !== 'undefined') {
			const node = document.querySelector(`[data-spotlight-id="${targetId}"]`);
			if (node) {
				Spotlight.focus(node);
			}
		}
	};

	focusSpotlightTarget = (spotlightId, fallbackSelector) => {
		let focused = false;
		try {
			if (spotlightId && Spotlight.focus) {
				focused = Spotlight.focus(spotlightId);
			}
			if (!focused && typeof document !== 'undefined') {
				const selector =
					fallbackSelector || (spotlightId ? `[data-spotlight-id="${spotlightId}"]` : null);
				if (selector) {
					const node = document.querySelector(selector);
					if (node && typeof node.focus === 'function') {
						node.focus();
						focused = true;
					}
				}
			}
		} catch (error) {
			// ignore focus errors
		}
		return focused;
	};

	focusPlayerControls = () => {
		if (!this.state.showPlayer) {
			return;
		}
		if (this.playerFocusTimeout) {
			clearTimeout(this.playerFocusTimeout);
		}
		this.playerFocusTimeout = setTimeout(() => {
			this.playerFocusTimeout = null;
			try {
				if (Spotlight.getPointerMode && Spotlight.getPointerMode()) {
					Spotlight.setPointerMode(false);
				}
				if (Spotlight.resume && Spotlight.isPaused && Spotlight.isPaused()) {
					Spotlight.resume();
				}
				if (Spotlight.setContainerDefault) {
					Spotlight.setContainerDefault('playerControls', 'player-back-button');
				}
				if (Spotlight.setActiveContainer) {
					Spotlight.setActiveContainer('playerControls');
				}
				let focused = false;
				if (Spotlight.focus) {
					focused = Spotlight.focus('player-back-button');
				}
				if (!focused) {
					const backButton = this.playerBackButtonNode;
					if (backButton) {
						const node =
							typeof backButton.nodeRef === 'object' && backButton.nodeRef
								? backButton.nodeRef.current || backButton.nodeRef
								: backButton;
						if (node && typeof node.focus === 'function') {
							node.focus();
							focused = true;
						}
					}
				}
				if (!focused && typeof document !== 'undefined') {
					const node = document.querySelector('[data-spotlight-id=\"player-back-button\"]');
					if (node && typeof node.focus === 'function') {
						node.focus();
					}
				}
			} catch (error) {
				// ignore focus errors
			}
		}, 0);
	};

	handleGlobalKeyDown = (event) => {
		if (!event) {
			return;
		}
		const keyCode = typeof event.keyCode === 'number' ? event.keyCode : event.detail && event.detail.keyCode;
		const keyName = event.key || '';
		const isBack =
			keyCode === 461 ||
			keyCode === 8 ||
			keyName === 'Backspace' ||
			keyName === 'Escape' ||
			keyName === 'WebOSBack' ||
			keyName === 'webOSBack';
		if (!isBack) {
			return;
		}
		if (this.state.showPlayer) {
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
			this.handleStopPlayback();
			return;
		}
		if (this.state.showCreatorPicker) {
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
			this.closeCreatorPicker();
		}
	};

	handleChannelFilter = (channelIdOrEvent) => {
		let channelId = channelIdOrEvent;
		if (channelIdOrEvent && channelIdOrEvent.currentTarget) {
			const datasetValue = channelIdOrEvent.currentTarget.dataset
				? channelIdOrEvent.currentTarget.dataset.channelId
				: null;
			channelId = datasetValue ? datasetValue : null;
		}
		this.setState((prev) => {
			const normalizedChannelId = channelId === prev.selectedChannelId ? null : channelId;
			const filteredVideos = normalizedChannelId
				? prev.videos.filter((video) => video.channel && video.channel.id === normalizedChannelId)
				: prev.videos;
			let nextSelectedVideo = prev.selectedVideo;
			if (
				normalizedChannelId &&
				(!nextSelectedVideo || !nextSelectedVideo.channel || nextSelectedVideo.channel.id !== normalizedChannelId)
			) {
				nextSelectedVideo = filteredVideos.length ? filteredVideos[0] : null;
			}
			if (!normalizedChannelId && !nextSelectedVideo && filteredVideos.length) {
				nextSelectedVideo = filteredVideos[0];
			}
			const nextSelectedIndex = nextSelectedVideo
				? prev.videos.findIndex((video) => video.id === nextSelectedVideo.id)
				: -1;
			const result = {
				selectedChannelId: normalizedChannelId,
				selectedVideo: nextSelectedVideo,
				selectedVideoIndex: nextSelectedIndex
			};
			return result;
		}, () => {
			this.queueFocusFirstVideo();
		});
	};

	renderHeroSection() {
		const {selectedCreator, creatorDetails} = this.state;
		if (!selectedCreator) {
			return null;
		}
		const cover =
			(creatorDetails &&
				creatorDetails.cover &&
				creatorDetails.cover.childImages &&
				creatorDetails.cover.childImages.length &&
				creatorDetails.cover.childImages[0].path) ||
			(creatorDetails && creatorDetails.cover && creatorDetails.cover.path) ||
			HERO_FALLBACK_COLOR;
		const avatar =
			selectedCreator.avatar ||
			(creatorDetails &&
				creatorDetails.icon &&
				creatorDetails.icon.childImages &&
				creatorDetails.icon.childImages.length &&
				creatorDetails.icon.childImages[0].path) ||
			(creatorDetails && creatorDetails.icon && creatorDetails.icon.path) ||
			null;
		const about =
			(creatorDetails && (creatorDetails.about || creatorDetails.description)) || selectedCreator.summary || '';
		const subscribers =
			(creatorDetails && creatorDetails.subscriberCount) ||
			(creatorDetails && creatorDetails.stats && creatorDetails.stats.subscriberCount) ||
			null;
		const postCount = creatorDetails && creatorDetails.postCount;

		return (
			<div className="creatorHero creatorHero--compact">
				<div
					className="creatorHero__cover"
					style={
						cover.startsWith('http')
							? {backgroundImage: `url(${cover})`}
							: {background: HERO_FALLBACK_COLOR}
					}
				/>
				<div className="creatorHero__overlay" />
				<div className="creatorHero__content">
					<div className="creatorHero__header">
						<div className="creatorHero__avatar">
							{avatar ? <img src={avatar} alt={selectedCreator.name} /> : <span>{selectedCreator.name[0]}</span>}
						</div>
						<div className="creatorHero__titles">
							<Heading size="large">{selectedCreator.name}</Heading>
							<div className="creatorHero__stats">
								{subscribers ? <span>{subscribers.toLocaleString()} Subscribers</span> : null}
								{postCount ? <span>{postCount.toLocaleString()} Posts</span> : null}
							</div>
						</div>
						<div className="creatorHero__actions">
							<Button
								size="small"
								icon="list"
								onClick={this.openCreatorPicker}
								data-spotlight-id="switchCreatorButton"
							>
								Switch Creator
							</Button>
							<Button size="small" onClick={() => this.setView('plans')}>
								View Plans
							</Button>
						</div>
					</div>
					{about ? (
						<div className="creatorHero__about">
							<BodyText>{about}</BodyText>
						</div>
					) : null}
				</div>
			</div>
		);
	}

	renderViewTabs(orientation = 'horizontal') {
		const tabs = [
			{id: 'home', label: 'Home'},
			{id: 'live', label: 'Live'},
			{id: 'plans', label: 'Plans'},
			{id: 'about', label: 'About'}
		];
		const {view} = this.state;
		const containerClass = orientation === 'vertical' ? 'viewTabs viewTabs--vertical' : 'viewTabs';
		const buttonClass = orientation === 'vertical' ? 'viewTab viewTab--vertical' : 'viewTab';
		return (
			<div className={containerClass}>
				{tabs.map((tab, index) => (
					<Button
						key={tab.id}
						className={`${buttonClass}${view === tab.id ? ' viewTab--active' : ''}`}
						selected={view === tab.id}
						onClick={() => this.setView(tab.id)}
						size="small"
						data-spotlight-id={orientation === 'vertical' ? `nav-item-${tab.id}` : undefined}
						data-spotlight-default={orientation === 'vertical' && index === 0 ? true : undefined}
					>
						{tab.label}
					</Button>
				))}
			</div>
		);
	}

	renderSearchRow() {
		const {searchTerm, searchAppliedTerm} = this.state;
		const hasSearch = !!(searchTerm || searchAppliedTerm);
		return (
			<div className="searchRow">
				<div className="searchInput">
					<Input
						placeholder="Search videos, posts, tags…"
						value={searchTerm}
						onChange={this.handleSearchChange}
						onKeyDown={(ev) => {
							if (ev && ev.keyCode === 13) {
								this.applySearchTerm(ev.target.value);
							}
						}}
						iconAfter="search"
						size="large"
						spotlightDisabled
					/>
					{hasSearch ? (
						<Button className="searchClear" size="small" icon="closex" onClick={this.clearSearch}>
							Clear
						</Button>
					) : null}
				</div>
			</div>
		);
	}

	renderChannelFilters(orientation = 'horizontal') {
		const {channels, selectedChannelId} = this.state;
		if (!channels.length) {
			return null;
		}
		const containerClass =
			orientation === 'vertical' ? 'channelPills channelPills--vertical' : 'channelPills';
		const buttonClass = orientation === 'vertical' ? 'channelButton channelButton--vertical' : 'channelButton';
		return (
			<div className={containerClass}>
				<Button
					size="small"
					selected={!selectedChannelId}
					data-channel-id=""
					onClick={this.handleChannelFilter}
					className={buttonClass}
					data-spotlight-id={orientation === 'vertical' ? 'channel-all' : undefined}
					data-spotlight-default={orientation === 'vertical' ? true : undefined}
				>
					All content
				</Button>
				{channels.map((channel) => (
					<Button
						key={channel.id || channel.title}
						size="small"
						selected={selectedChannelId === channel.id}
						data-channel-id={channel.id || ''}
						onClick={this.handleChannelFilter}
						className={buttonClass}
						data-spotlight-id={orientation === 'vertical' ? `channel-${channel.id}` : undefined}
						data-spotlight-default={false}
					>
						{channel.title}
					</Button>
				))}
			</div>
		);
	}

	renderVideoCard(video, restProps = {}) {
		const isSelected = this.state.selectedVideo && video.id === this.state.selectedVideo.id;
		const {className: restClassName, key: renderKey, index, ...rest} = restProps;
		const spotlightId = rest['data-spotlight-id'] || `videoCard-${typeof index === 'number' ? index : video.id}`;
	const compositeClassName = ['videoCard', restClassName, isSelected ? 'videoCard--selected' : '']
		.filter(Boolean)
		.join(' ');
	return (
			<FocusableCard
				{...rest}
				key={renderKey || video.id}
				className={compositeClassName}
				data-id={video.id}
				data-spotlight-id={spotlightId}
				role="button"
				onClick={this.handleVideoActivate}
			>
				<div
					className={`videoThumb${video.thumbnail ? '' : ' videoThumb--placeholder'}`}
					style={video.thumbnail ? {backgroundImage: `url(${video.thumbnail})`} : undefined}
				>
					{!video.thumbnail ? 'No preview available' : null}
					{video.isLive ? <span className="liveBadge">LIVE</span> : null}
				</div>
				<Heading size="tiny" className="videoTitle">
					{video.title}
				</Heading>
				<div className="videoMeta">
					{video.channel ? <span className="badge badge--channel">{video.channel.title}</span> : null}
					{video.isLive ? <span className="badge badge--live">LIVE</span> : null}
					{video.duration ? <span className="badge">{formatDuration(video.duration)}</span> : null}
					{video.publishedAt ? <span className="badge badge--muted">{formatDateTime(video.publishedAt)}</span> : null}
				</div>
				{!video.isPlayable ? (
					<BodyText className="videoMeta__warning">No video attachment</BodyText>
				) : null}
			</FocusableCard>
		);
	}

	renderVideoItem({index, data, ...rest}) {
		const videos = data || this.state.videos;
		const video = videos && videos[index];
		if (!video) {
			return null;
		}
		return this.renderVideoCard(video, {
			...rest,
			index,
			key: `${video.id}-${index}`,
			'data-spotlight-id': `videoCard-${index}`,
			'data-spotlight-default': index === 0 ? true : undefined
		});
	}

	renderVideosGrid() {
		const {
			videos,
			loadingVideos,
			selectedVideo,
			videoLoading,
			playerError,
			hasMoreVideos,
			selectedChannelId,
			searchAppliedTerm,
			errorMessage
		} = this.state;
		const visibleVideos = selectedChannelId
			? videos.filter((video) => video.channel && video.channel.id === selectedChannelId)
			: videos;
		this.visibleVideosCache = visibleVideos;

		const showSpinner = loadingVideos && !visibleVideos.length;
		const showLoadMore = hasMoreVideos && !loadingVideos;

		return (
			<div className="contentSection">
				{showSpinner ? (
					<div className="columnPlaceholder">
						<Spinner size="medium" show centered />
						<BodyText>{searchAppliedTerm ? `Searching “${searchAppliedTerm}”…` : 'Loading content…'}</BodyText>
					</div>
				) : visibleVideos.length ? (
					<div className="videoArea">
						<div className="videoGridWrapper">
							<VirtualGridList
								className="videoVirtualGrid"
								data={visibleVideos}
								dataSize={visibleVideos.length}
								itemRenderer={this.renderVideoItem}
								itemSize={{minWidth: 400, minHeight: 320}}
								spotlightId="videoGridContainer"
								spotlightPrevLeft="sideNav"
								spotlightNextLeft="sideNav"
								enterTo="default-element"
								spacing={18}
								focusableScrollbar
							/>
						</div>
						{showLoadMore ? (
							<div className="loadMoreRow">
								<Button onClick={this.loadMoreVideos} size="large" disabled={loadingVideos}>
									{loadingVideos ? 'Loading…' : 'Load More'}
								</Button>
							</div>
						) : null}
					</div>
				) : (
					<div className="columnPlaceholder">
						<BodyText>
							{errorMessage
								? errorMessage
								: searchAppliedTerm
								? `No posts matched "${searchAppliedTerm}".`
								: selectedChannelId
								? 'No videos available for this channel yet.'
								: 'Select a creator to load their recent posts.'}
						</BodyText>
					</div>
				)}
			</div>
		);
	}

	renderPlansView() {
		const {creatorDetails} = this.state;
		const plans = (creatorDetails && creatorDetails.plans) || [];
		return (
			<div className="contentSection">
				{plans.length ? (
					<div className="plansGrid">
						{plans.map((plan) => (
							<div key={plan.id || plan.title} className="planCard">
								<Heading size="small">{plan.title || 'Membership Plan'}</Heading>
								{plan.description ? <BodyText>{plan.description}</BodyText> : null}
								{plan.price ? (
									<BodyText className="planPrice">
										{plan.price.amount
											? `${plan.price.amount / 100} ${plan.price.currency || 'USD'}/mo`
											: ''}
									</BodyText>
								) : null}
							</div>
						))}
					</div>
				) : (
					<div className="columnPlaceholder">
						<BodyText>
							Plan details aren’t available via the API yet. Visit floatplane.com on the web to manage
							your subscription.
						</BodyText>
					</div>
				)}
			</div>
		);
	}

	renderAboutView() {
		const {creatorDetails} = this.state;
		const about =
			(creatorDetails && (creatorDetails.about || creatorDetails.description || creatorDetails.summary)) ||
			'No additional information provided by this creator yet.';
		const socialLinks = (creatorDetails && creatorDetails.socialLinks) || [];
		return (
			<div className="contentSection aboutSection">
				<BodyText>{about}</BodyText>
				{socialLinks.length ? (
					<div className="socialLinks">
						<Heading size="tiny">Connect</Heading>
						<div className="socialLinkButtons">
							{socialLinks.map((link) => (
								<Button key={link.url} size="small">
									{link.title || link.url}
								</Button>
							))}
						</div>
					</div>
				) : null}
			</div>
		);
	}

	renderLiveView() {
		const {liveStream, liveReplay, liveStatusMessage} = this.state;
		const hasLive = liveStream && liveStream.state && liveStream.state !== 'off';
		return (
			<div className="contentSection liveSection">
				<div className="liveCards">
					<div className="liveCard liveCard--primary">
						<Heading size="small">Live Broadcast</Heading>
						{hasLive ? (
							<>
								<div className="liveCard__title">{liveStream.title || 'On Air'}</div>
								{liveStream.description ? (
									<BodyText>{liveStream.description}</BodyText>
								) : (
									<BodyText>Join the live stream and chat in real time.</BodyText>
								)}
								{liveStatusMessage ? <BodyText className="liveStatus">{liveStatusMessage}</BodyText> : null}
								<div className="liveActions">
									<Button size="large" icon="play" onClick={this.handlePlayLiveStream}>
										Watch Live
									</Button>
									<Button size="small" icon="chat">
										Open Chat (Coming Soon)
									</Button>
								</div>
							</>
						) : (
							<>
								<BodyText>No live broadcast is currently active.</BodyText>
								{liveReplay ? (
									<>
										<BodyText>Catch the latest WAN Show replay below.</BodyText>
										<Button size="large" onClick={() => this.playVideoById(liveReplay.id)}>
											Watch Latest Replay
										</Button>
									</>
								) : null}
							</>
						)}
					</div>
					<div className="liveCard liveCard--chat">
						<Heading size="small">Live Chat</Heading>
						<BodyText>
							Real-time chat integration (including WAN Show stage chat) will appear here in a future
							update. For now you can follow along on Floatplane’s website or the official Discord.
						</BodyText>
					</div>
				</div>
				<div className="liveSection__replays">
					<Heading size="small">Recent WAN Shows &amp; Livestreams</Heading>
					{liveReplay ? (
						<div className="liveReplayCard">
							<div className="liveReplay__body">
								<div className="liveReplay__title">{liveReplay.title}</div>
								<div className="liveReplay__meta">
									{liveReplay.duration ? <span>{formatDuration(liveReplay.duration)}</span> : null}
									{liveReplay.publishedAt ? <span>{formatDateTime(liveReplay.publishedAt)}</span> : null}
								</div>
								<BodyText>{liveReplay.description}</BodyText>
							</div>
							<Button onClick={() => this.handlePlaySelected()} size="large">
								Play Latest Replay
							</Button>
						</div>
					) : (
						<BodyText>No recent livestreams detected in the feed.</BodyText>
					)}
				</div>
			</div>
		);
	}

	renderMainContent() {
		const {view} = this.state;
		switch (view) {
			case 'live':
				return this.renderLiveView();
			case 'plans':
				return this.renderPlansView();
			case 'about':
				return this.renderAboutView();
			case 'home':
			default:
				return this.renderVideosGrid();
		}
	}

	renderStatusBar() {
		const {infoMessage, errorMessage} = this.state;
		if (!infoMessage && !errorMessage) {
			return null;
		}
		return (
			<div className="statusBar">
				{infoMessage ? <div className="statusBar__info">{infoMessage}</div> : null}
				{errorMessage ? <div className="statusBar__error">{errorMessage}</div> : null}
			</div>
		);
	}

	renderCreatorPicker() {
		const {showCreatorPicker, creators, selectedCreatorIndex} = this.state;
		if (!showCreatorPicker) {
			return null;
		}
		return (
			<div
				className="creatorPickerOverlay"
				data-spotlight-container="true"
				data-spotlight-id="creatorPickerOverlay"
				data-spotlight-restrict="self"
			>
				<div className="creatorPicker">
					<div className="creatorPicker__header">
						<Heading size="small">Choose a Creator</Heading>
						<Button size="small" icon="closex" onClick={() => this.closeCreatorPicker()}>
							Close
						</Button>
					</div>
					<Scroller className="creatorPicker__list">
						{creators.map((creator, index) => (
							<Item
								key={creator.id || creator.slug || index}
								data-index={index}
								selected={index === selectedCreatorIndex}
								onClick={this.handleCreatorActivate}
								className="creatorPicker__item"
								data-spotlight-id={`creatorPickerItem-${index}`}
								data-spotlight-default={index === 0 ? true : undefined}
							>
								<div className="creatorPicker__name">{creator.name}</div>
								{creator.summary ? (
									<div className="creatorPicker__summary">{creator.summary}</div>
								) : null}
							</Item>
						))}
					</Scroller>
				</div>
			</div>
		);
	}

	renderHomePanel() {
		const {user, creators, loadingCreators} = this.state;
		const subtitle = user
			? `Logged in as ${user.displayName || user.username || user.email || 'viewer'}`
			: undefined;

		return (
			<Panel>
				<Header title="Floatplane TV" subtitle={subtitle} />
				<div className="appPanelBody homePanelBody homePanelBody--twoPane">
					{loadingCreators && !creators.length ? (
						<div className="loadingCreators">
							<Spinner show centered />
							<BodyText>Loading your subscriptions…</BodyText>
						</div>
					) : (
						<>
							<div
								className="homeSideNav"
								data-spotlight-container="true"
								data-spotlight-id="sideNav"
								data-spotlight-default-element="nav-item-home"
								data-spotlight-next-right="videoGridContainer"
							>
								<div className="sideNav__section">
									{this.renderSearchRow()}
								</div>
								<div className="sideNav__section">
									<Heading size="tiny">Sections</Heading>
									{this.renderViewTabs('vertical')}
								</div>
								<div className="sideNav__section">
									<Heading size="tiny">Channels</Heading>
									{this.renderChannelFilters('vertical')}
								</div>
								<div className="sideNav__grow" />
								<Button className="sideNav__logout" onClick={this.handleLogout} size="small">
									Log Out
								</Button>
							</div>
							<div className="homeMain" data-spotlight-prev-left="sideNav">
								{this.renderHeroSection()}
								{this.renderStatusBar()}
								<div className="homeMain__content">{this.renderMainContent()}</div>
							</div>
						</>
					)}
				</div>
				{this.renderCreatorPicker()}
			</Panel>
		);
	}

	renderPlayerPanel() {
		const {selectedVideo, videoSource, availableSources, selectedQuality, videoLoading} = this.state;
		const subtitle = selectedVideo
			? selectedVideo.description
				? selectedVideo.description.slice(0, 96)
				: ''
			: 'Select content from the home screen.';

		return (
			<Panel>
				<Header title={(selectedVideo && selectedVideo.title) || 'Now Playing'} subtitle={subtitle} />
					<div className="appPanelBody playerPanelBody">
						<div className="playerContainer">
							{videoSource ? (
								<video
									ref={this.videoRef}
									key={`${selectedVideo && selectedVideo.id ? selectedVideo.id : 'video'}-${selectedQuality || 'auto'}`}
									className="videoElement"
									controls
									autoPlay
									playsInline
									preload="auto"
									crossOrigin="use-credentials"
								>
									<source src={videoSource.url} type={videoSource.type || 'application/x-mpegURL'} />
								</video>
							) : (
								<div className="playerPlaceholder">
									{videoLoading ? (
										<Spinner show size="medium" centered />
									) : (
										<BodyText>Select a video to begin playback.</BodyText>
									)}
								</div>
							)}
							<div
								className="playerControls"
								data-spotlight-container="true"
								data-spotlight-id="playerControls"
							>
								<Button
									onClick={this.handleStopPlayback}
									size="large"
									data-spotlight-id="player-back-button"
									componentRef={(node) => {
										this.playerBackButtonNode = node;
									}}
								>
									Back to Home
								</Button>
								{availableSources.length > 1 ? (
									<div className="qualitySelector">
										<Heading size="tiny">Quality</Heading>
										<div className="qualityButtons">
											{availableSources.map((source) => {
												const label = source.quality || 'Auto';
												const isSelected =
													(source.quality || '').toLowerCase() ===
													(selectedQuality || '').toLowerCase();
												return (
													<Button
														key={`${label}-${source.url}`}
														selected={isSelected}
														data-quality={source.quality || ''}
														data-spotlight-id={`quality-${(label || 'auto')
															.toLowerCase()
															.replace(/[^a-z0-9]+/g, '-')}`}
														onClick={this.handleQualityActivate}
														size="small"
													>
														{label}
													</Button>
												);
											})}
										</div>
									</div>
								) : null}
							</div>
						</div>
					</div>
				</Panel>
			);
		}

	render() {
		const {user, showPlayer} = this.state;
		const panelIndex = !user ? 0 : showPlayer ? 2 : 1;

		return (
			<Panels index={panelIndex}>
				<Panel>
					<Header title="Floatplane TV (Enact MVP)" subtitle="Sign in to continue" />
					<LoginForm onLoginSuccess={this.handleLoginSuccess} />
				</Panel>
				{this.renderHomePanel()}
				{this.renderPlayerPanel()}
			</Panels>
		);
	}
}

const App = MoonstoneDecorator(AppBase);

export default App;
