import { PUBLIC_SLACK_CLIENT_ID } from '$env/static/public';
import { SESSIONS_SECRET, SLACK_CLIENT_SECRET } from '$env/static/private';
import { db, rawUsers } from '$lib/server/db';
import { json, redirect } from '@sveltejs/kit';
import { symmetric } from '$lib/server/crypto';

const MISSING_SLACK_OAUTH_CODE = 'Missing Slack OAuth code';
const BAD_SLACK_OPENID_RESPONSE_STATUS = 'Bad Slack OpenID response status';
const INVALID_SLACK_OAUTH_CODE = 'Invalid Slack OAuth code';
const BAD_SLACK_OPENID_RESPONSE = 'Bad Slack OpenID response';
const WRONG_SLACK_WORKSPACE =
	'Wrong Slack workspace! Please use the Hack Club Slack workspace to sign in.';

function parseJwt(slackIdToken: string) {
	const base64Url = slackIdToken.split('.')[1];
	if (!base64Url) {
		console.error('No Base64 URL in the JWT');
		throw new Error(BAD_SLACK_OPENID_RESPONSE);
	}

	const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	const jsonPayload = decodeURIComponent(
		Buffer.from(base64, 'base64')
			.toString('utf-8')
			.split('')
			.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
			.join('')
	);

	return JSON.parse(jsonPayload);
}

export async function GET({ url, cookies }) {
	const searchParams = url.searchParams;
	const code = searchParams.get('code');
	if (!code) {
		return json({ error: MISSING_SLACK_OAUTH_CODE }, { status: 400 });
	}

	const exchangeUrl = new URL('https://slack.com/api/openid.connect.token');
	const exchangeSearchParams = exchangeUrl.searchParams;
	exchangeSearchParams.append('client_id', PUBLIC_SLACK_CLIENT_ID);
	exchangeSearchParams.append('client_secret', SLACK_CLIENT_SECRET);
	exchangeSearchParams.append('code', code);
	console.log(`${url.origin}/api/slack-callback`);
	exchangeSearchParams.append('redirect_uri', `${url.origin}/api/slack-callback`);

	const oidcResponse = await fetch(exchangeUrl, { method: 'POST' });
	if (oidcResponse.status !== 200) {
		return json({ error: BAD_SLACK_OPENID_RESPONSE_STATUS }, { status: 400 });
	}

	const responseJson = await oidcResponse.json();
	if (!responseJson.ok) {
		console.error(responseJson);
		return json(
			{
				error:
					responseJson.error === 'invalid_code'
						? INVALID_SLACK_OAUTH_CODE
						: BAD_SLACK_OPENID_RESPONSE_STATUS
			},
			{ status: 401 }
		);
	}

	const jwt = parseJwt(responseJson.id_token);
	if (jwt['https://slack.com/team_domain'] !== 'hackclub') {
		return json({ error: WRONG_SLACK_WORKSPACE }, { status: 401 });
	}

	const slackId = jwt['https://slack.com/user_id'];
	const avatarUrl = jwt.picture;

	// console.log(jwt)

	await db
		.insert(rawUsers)
		.values({
			slackId,
			avatarUrl,
			isAdmin: false
		})
		.onConflictDoUpdate({
			target: rawUsers.slackId,
			set: {
				// update the avatar on each login!
				avatarUrl
			}
		});

	cookies.set('_boba_mahad_says_hi_session', await symmetric.encrypt(slackId, SESSIONS_SECRET), {
		path: '/',
		maxAge: 60 * 60 * 24 * 90 // 90 days in seconds
	});

	throw redirect(301, '/');
}
