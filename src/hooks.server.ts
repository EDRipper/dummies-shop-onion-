import { sequence } from '@sveltejs/kit/hooks';
import { db, usersWithTokens } from '$lib/server/db';
import { redirect, type Handle } from '@sveltejs/kit';
import { SESSIONS_SECRET } from '$env/static/private';
import { PUBLIC_SLACK_CLIENT_ID } from '$env/static/public';
import { symmetric } from '$lib/server/crypto';
import { eq } from 'drizzle-orm';

const slackMiddleware: Handle = async ({ event, resolve }) => {
	// Might not have the record yet 
	if (event.url.toString().includes('slack-callback')) return resolve(event);
	if (event.url.toString().includes('/api/uploadthing')) return resolve(event);

	const start = performance.now();
	const sessionCookie = event.cookies.get('_boba_mahad_says_hi_session');
		if (!sessionCookie) return resolve(event);

		let slackId: string | undefined;
		try {
			slackId = await symmetric.decrypt(sessionCookie, SESSIONS_SECRET);
			if (!slackId) throw new Error('Empty slackId');
		} catch (err) {
			// Hi mahad lol
			event.cookies.delete('_boba_mahad_says_hi_session', { path: '/' });
			return resolve(event);
		}

	// Attempt to load the user from the DB, sometimes this fails bc the user isnt created yet
	// In this case just remove the cookie and continue as unauthenticated
	try {
		if (!db) {
			// no DB configured/initialized
			event.cookies.delete('_boba_mahad_says_hi_session', { path: '/' });
			return resolve(event);
		}

		const [user] = await db
			.select()
			.from(usersWithTokens)
			.where(eq(usersWithTokens.slackId, slackId!))
			.limit(1);
		if (!user) {
			// user not found; remove cookie and continue as unauthenticated
			event.cookies.delete('_boba_mahad_says_hi_session', { path: '/' });
			return resolve(event);
		}
		event.locals.user = user;
	} catch (err) {
		console.error('Error loading user from DB in slackMiddleware:', err);
		event.cookies.delete('_boba_mahad_says_hi_session', { path: '/' });
		return resolve(event);
	}

	console.log(`slackMiddleware took ${performance.now() - start}ms`);
	return resolve(event);
};

const redirectMiddleware: Handle = async ({ event, resolve }) => {
	// Allow uploadthing API through without redirect
	if (event.url.toString().includes('/api/uploadthing')) return resolve(event);

	// some points like the landing page should not force login
	const publicPaths = new Set(['/','/landing','/index','/rsvp','/rsvp/','/api/slack-callback','/robots.txt','/sitemap.xml']);
	// also allow assets without sign in
	if (event.url.pathname.startsWith('/static') || event.url.pathname.startsWith('/assets')) return resolve(event);

	// If the request is for a public path, just resolve and render the page
	if (publicPaths.has(event.url.pathname)) return resolve(event);

	// and if a page should be protected loop them back to sign in
	if (!event.locals.user) {
		// Force HTTPS for the redirect URI
		const redirectUri = process.env.ORIGIN || event.url.origin.replace('http://', 'https://');
		const authorizeUrl = `https://hackclub.slack.com/oauth/v2/authorize?scope=&user_scope=openid%2Cprofile%2Cemail&redirect_uri=${redirectUri}/api/slack-callback&client_id=${PUBLIC_SLACK_CLIENT_ID}`;
		return redirect(302, authorizeUrl);
	}

	// Bonk non admins back to home if they try to access admin pages
	if (event.locals.user && !event.locals.user.isAdmin && event.url.pathname.includes('admin')) {
		return redirect(302, '/');
	}

	return resolve(event);
};

export const handle = sequence(slackMiddleware, redirectMiddleware);
