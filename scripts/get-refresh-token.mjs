import { OAuth2Client } from 'google-auth-library'
import http from 'http'
import { URL } from 'url'

const CLIENT_ID = '777416031101-qubtutmml2paid64n8opkmgglgg27l64.apps.googleusercontent.com'
const CLIENT_SECRET = 'REDACTED_GOOGLE_CLIENT_SECRET'
const REDIRECT_URI = 'http://localhost:4000'

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/drive.file',
  ],
})

console.log('\n1. 아래 URL을 브라우저에서 여세요:\n')
console.log(authUrl)
console.log('\n승인 후 자동으로 토큰이 출력됩니다...\n')

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4000')
  const code = url.searchParams.get('code')
  if (!code) { res.end('No code'); return }

  res.end('<h2>완료! 터미널을 확인하세요. 창을 닫으셔도 됩니다.</h2>')
  server.close()

  const { tokens } = await oauth2Client.getToken(code)
  console.log('===== .env.local에 복사하세요 =====')
  console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
  console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log('====================================\n')
  process.exit(0)
}).listen(4000)
