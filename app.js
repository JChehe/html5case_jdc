const Koa = require('koa')
const app = new Koa()
const router = require('./router')

app.use(async (ctx, next) => {
	const start = new Date()
	await next()
	const ms = new Date() - start
	console.log(`${ms}ms`)
	ctx.set('X-Response-Time', `${ms}ms`)
})

app.use(router.routes())


app.on('error', err =>
  log.error('server error', err)
);


app.listen(3000)