import { google } from 'googleapis'

const CLIENT_ID = '1083448792265-7fr2gka3apk9dvhe18r3h99cnk5ci871.apps.googleusercontent.com'
const CLIENT_SECRET = 'REDACTED_GOOGLE_CLIENT_SECRET'
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

const code = process.argv[2]
if (!code) { console.error('Usage: npx tsx exchange-token.ts <code>'); process.exit(1) }

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

oauth2Client.getToken(code).then(({ tokens }) => {
  console.log('\n=== .env.local에 추가하세요 ===\n')
  console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
  console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log('\n================================\n')
}).catch(e => { console.error('실패:', e.message) })
