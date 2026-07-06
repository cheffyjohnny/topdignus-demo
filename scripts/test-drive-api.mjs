import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: 'topdignus-drive@fabled-essence-494307-t2.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDS2dMmqhmCTOHJ\n0p72n8qp5HpiutSG0oDiCqWtw6eli5RuwxiIB2Y6SHLBCCfXTCHP7eFqpciWHA4/\nXAV9r4yBpjHvBrQKxmbnpKO+c2/RbqSk9Ikhp7l1czCrGhCzJw47o6oTZ9/88k7P\njLeb2n/ymHAlc5gjjI3GSV0X0Ttz8DdDMEN7XabaQOUOQE+1pM0fvb4TJSZCRlqD\ncYFROc9jgfIPrVskaIAqvcfmAYhf6mTMdVjoU09x5Df0GUg8jDgB16zcAleqbM6D\nBtoNBSf6mJwGgD92euwNSHfxiaFmyQDdLVZxnRolbIZagToN9LCjJkGXixFCEKdj\nRuM/dJn/AgMBAAECggEAF+V3AE1L6dAT0N9Ng871VY7e7fyVpJgL4lJpl4lyoRjy\nICF9UMFh7R4T31uwxD5NILcpkoAqfRS96qFfv/Ba4MC4rQnZ8tSsiflHU4jateYv\nw8AxIH7VToHZFLM2DE/TVaAFYQCnSpAdrXkZwBCh6pkrMJtqtTCzSrM62T2t2sQ8\nfUpw4xa0UaWNSgWjIVNMPJSxIswI+4T0aTFun4nzmhuvJgDc6mHWpuVWEoWOEItu\nDjFKDV/ATrSEuxZ1B+7LI63e5SWy00cBm7aVCCpJBlNcwqfICVfpVXIVkG8/gXC4\nYxlADkZSyVWnQIKrGOYfOsfz/MDnE4AiTnSaH719RQKBgQD4+QPP8fY0ufIHculo\nVdsIjEdyeorpI1RDSvezriydFDiee4yZ0BaMEfMb/zGO8QqqzKoKsc21m4HX4FF9\nb92MtqUmOOkyuR0RNK2Wx4ah3IUu2mSkM5huVeMKPfUTpEL7FfdWbywFNcIALy3u\nvlu/odkYNVAQxfWecgvuAKoX+wKBgQDYzVsG1A4uREupmCL5ihBV/pG5IYydZrUE\nuWc3BO8RZGMmeQUHmR+u1AxzsQ63uCH3veHfZcPXWCyGCdj8pFP8ONf2bbk+ACe1\n58l6L3Ek89u5wZrZqJjhudQ0G3gEfZDDzFvkATAX03CrSLX31KpBpJAe7ujJtB+o\n/AV/aONSzQKBgH+9e8hAU9s/oD9UJQ9kJYpgNvQ0jXsKplwUZbyp27gIPPiLWVs9\nmaPqPbqal3nIkHmLop70FSBdliQFsqnSMHDW8SsIPhXJRnGifoIDAz+e3jJo2QQq\neMX7iQ6jNVALklYzMgEF7ycJKu1fR4jb4EUVLEawa9D/UIMn7pkBfEPrAoGABixC\nrT0YckTLirakOEqwEGLBL24/HLQx70KAJ9biH7KmCBBmDkNT3Zx4BktCSgTaIr2r\nUrsJCnaePerF3Nuo8IOF0qRpI9TJTKqe1/XF2PGAjhdvG0drovGxkxI9JpOUrZ6B\n90n5XpRMnvPhCn9poZjX6amPwz53sE4MsgYAgvkCgYEA7VkNNOIcUKcf7tksXgQt\nQ8xn2IvWriSN32k3zE4ZOzneUNK4FOqGLX8gh4nhL0UkeTe6fUw32NPeFGyhHMI5\niyGljM0V1IkZbHNfGGQx6Ca334XhrvgGrs0IlYlYpM10n0nyYId+tdZFLHeY4C92\nM7A7wbvWqzhvwU3clBRq4gQ=\n-----END PRIVATE KEY-----\n`,
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
})

const drive = google.drive({ version: 'v3', auth })

const TEMP_FOLDER_ID = '1Jcb673bwaU9a2HmrIVDqtY2CULxgSrmk'

try {
  const res = await drive.files.create({
    requestBody: {
      name: `test_${Date.now()}`,
      mimeType: 'application/vnd.google-apps.document',
      parents: [TEMP_FOLDER_ID],
    },
    fields: 'id',
  })
  const fileId = res.data.id
  console.log('✅ 파일 생성 성공:', fileId)
  await drive.files.delete({ fileId })
  console.log('✅ 파일 삭제 성공')
} catch (e) {
  console.log('❌ 오류:', e.message)
}
