const router = require('koa-router')()
const hexoUtil = require('hexo-util')
const fs = require('fs-extra')
const moment = require('moment')
const axios = require('axios')
const md5 = require('md5')
const AV = require('leancloud-storage')
const { baiduTran, leanCloud } = require('./config')
const { getBaiduTranSign, getFileContent } = require('./utils')
const JDC_URL = 'http://jdc.jd.com/jdccase/jsonp/project?category=H5'
const BAIDUTRAN_URL = 'http://api.fanyi.baidu.com/api/trans/vip/translate?q='


let bd_appId = baiduTran.appId,
	bd_salt = baiduTran.salt,
	bd_secret = baiduTran.secret;

let lc_appId = leanCloud.appId,
	lc_appKey = leanCloud.appKey;

AV.init({
	appId: lc_appId,
	appKey: lc_appKey
})

let Case = AV.Object.extend('Case')
let caseQuery = new AV.Query('Case')

router.get('/', (ctx) => {
	ctx.response.body = 'hello world\n' // or ctx.body
})

function getAllTranReq(url) {
	urls.push(url)
	return urls
}
router.get('/h5', (ctx) => {
	axios.get(JDC_URL)
		.then((response) => {
			let { status, statusText, headers, config, request, data } = response
			if(status === 200) {

				let dataArr = eval(data)
				let cases = []
				let tran_urls = []

				for(let i = 0, len = dataArr.length; i < len; i++) {
					let item = dataArr[i],
						title = item.title,
						bd_sign = getBaiduTranSign({bd_appId, title, bd_salt, bd_secret});
						
					tran_urls.push(`${BAIDUTRAN_URL}${encodeURI(title)}&from=zh&to=en&appid=${bd_appId}&salt=${bd_salt}&sign=${bd_sign}`)
				}

				let req_urls = tran_urls.map(function(url) {
					return axios.get(url)
				})

				axios.all(req_urls)
					.then(axios.spread(function(...trans_result) {
						for(let i = 0; i < trans_result.length; i++) {
							let tranRes = trans_result[i],
								typeStr = 'tags:';
							let item = dataArr[i],
								title = item.title;

							if(tranRes.status !== 200) {
								return new Error('请求百度翻译失败')
							}
							if(item.type && item.type.length === 0) {
								console.log(`第${i}个的item.type为空`)
							} else {
								for(var j = 0; j < item.type.length; j++) {
									if(item.type[j].name === undefined) {
										continue
									} else {
										typeStr += `\n  - ${item.type[j].name}`
									}
								}
							}
							let trans_filename = tranRes.data.trans_result[0].dst
							let format_filename = hexoUtil.slugize(trans_filename, { transform: 1 }) // 与hexo生成的文件名一致
							let file_createDate = moment(item.createTime).format('YYYY-MM-DD') // 文件的创建时间，非我创建的时间
							let final_filename = `./cases/${file_createDate}-${format_filename}.md`

							let content = getFileContent({
								title: title,
								desc: item.desc,
								cover: item.image,
								typeStr,
								date: item.createTime,
								publishDate: item.projectTime,
								link: item.url
							})

							let caseItem = new Case()

							// 如果直接用原来的_id，会占用LeadCloud上的 ObjectId，这样会导致通过 id 查询时报错： Object not found
							for( let key in item ) {
								if(key !== '_id') {
									caseItem.set(key, item[key])
								} else {
									caseItem.set('ori_id', item['_id'])
								}
							}

							caseItem.set('trans_filename', trans_filename)
							caseItem.set('format_filename', format_filename)
							caseItem.set('final_filename', final_filename)
							caseItem.set('file_content', content)

							caseQuery.equalTo('ori_id', item['_id']).find()
								.then((avCase) => {
									// 不存在，是 []
									// console.log(avCase)
									if(avCase.length === 0) {
										caseItem.save()
											.then((saveRes) => {
												console.log('Object id is: ' ,saveRes.id)
											})
											.catch((error) => {
												console.log(error)
											})
									}
								})
								.catch((error) => {
									console.log(error)
								})

							

							fs.outputFile(final_filename, content, (err) => {
								if(err) return err;
								console.log(`create file: ${content}`)
							})

							// 用于测试
							/*if(i === 0) {
								break;
							}*/
						}
					}))
					.catch((error) => {
						console.log(error)
					})
				}
		})
		.catch((error) => {
			console.log(error)
		})
	ctx.response.body = '生成中...\n'
})


// 用于回调JDC返回的JSONP
function callback(data) {
	return data
}

module.exports = router