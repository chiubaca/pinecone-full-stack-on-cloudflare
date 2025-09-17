import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { Hono } from 'hono';
import { getDestinationForCountry, getRoutingDestinations } from '../helpers/route-ops.js';
import type { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

export const App = new Hono<{ Bindings: Env }>();

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
