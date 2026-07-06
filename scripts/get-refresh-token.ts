import { google } from 'googleapis'
import * as readline from 'readline'

const CLIENT_ID = '1083448792265-7fr2gka3apk9dvhe18r3h99cnk5ci871.apps.googleusercontent.com'
const CLIENT_SECRET = 'REDACTED_GOOGLE_CLIENT_SECRET'
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive',
]

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
})

console.log('\n=== Google OAuth 인증 ===')
console.log('\n1. 아래 URL을 브라우저에서 열어주세요:\n')
console.log(authUrl)
console.log('\n2. Google 계정으로 로그인 후 권한 허용')
console.log('3. 표시된 코드를 복사해서 붙여넣기\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('인증 코드 입력: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await oauth2Client.getToken(code.trim())
    console.log('\n=== .env.local에 추가하세요 ===\n')
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('\n================================\n')
  } catch (e) {
    console.error('토큰 발급 실패:', e)
  }
})
