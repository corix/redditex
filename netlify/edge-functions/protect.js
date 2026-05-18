export default async (request, context) => {
  const user = Deno.env.get('BASIC_AUTH_USER')
  const pass = Deno.env.get('BASIC_AUTH_PASSWORD')

  if (!user || !pass) {
    return context.next()
  }

  const auth = request.headers.get('authorization')
  const expected = `Basic ${btoa(`${user}:${pass}`)}`

  if (auth === expected) {
    return context.next()
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="redditex"',
    },
  })
}
