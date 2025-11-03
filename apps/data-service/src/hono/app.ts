import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { Hono } from 'hono';
import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '../helpers/route-ops.js';
import type { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

export const App = new Hono<{ Bindings: Env }>();

App.get('/ws/click-socket', async (c) => {
	const upgradeHeader = c.req.header('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return c.text('Expected Upgrade: websocket', 426);
	}

	// const accountId = c.req.header('account-id');
	const accountId = '1234567890';
	if (!accountId) return c.text('No Headers', 404);
	const doId = c.env.LINK_CLICK_TRACKER_DO.idFromName(accountId);
	const stub = c.env.LINK_CLICK_TRACKER_DO.get(doId);
	return await stub.fetch(c.req.raw);
});

App.get('/test/test', (c) => {
	return c.text('sup');
});

App.get('/:id', async (c) => {
	const { id } = c.req.param();
	const linkData = await getRoutingDestinations(c.env, id);

	if (!linkData) {
		return c.json({ error: 'Link not found' }, 404);
	}

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);

	if (!cfHeader.success) {
		return c.text('bad cf headers', 400);
	}

	const headers = cfHeader.data;

	const destination = getDestinationForCountry(linkData, headers.country);

	const queueMessage: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			id,
			country: headers.country,
			destination: destination,
			accountId: linkData.accountId,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		},
	};
	c.executionCtx.waitUntil(c.env.QUEUE.send(queueMessage));
	return c.redirect(destination);
});

App.get('/link-click/:accountId', async (c) => {
	const accountId = c.req.param('accountId');
	const doId = c.env.LINK_CLICK_TRACKER_DO.idFromName(accountId);
	const stub = c.env.LINK_CLICK_TRACKER_DO.get(doId);
	return await stub.fetch(c.req.raw);
});
