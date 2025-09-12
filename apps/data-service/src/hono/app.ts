import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { Hono } from 'hono';
import { getDestinationForCountry, getRoutingDestinations } from '../helpers/route-ops.js';

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

	return c.redirect(destination);
});
