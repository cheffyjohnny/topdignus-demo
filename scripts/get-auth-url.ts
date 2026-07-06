import { google } from 'googleapis'

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

console.log(authUrl)
