const md5 =  require('md5')

exports.getBaiduTranSign = function ({bd_appId, title, bd_salt, bd_secret}) {
	return md5(`${bd_appId}${title}${bd_salt}${bd_secret}`)
}

let mkTemplate = 
exports.getFileContent = function({title, desc, cover, typeStr, date, publishDate, link}) {
	desc = desc.replace(/\n/g, ' ')
return `title: ${title}
subtitle: ${desc}
cover: ${cover}
${typeStr}
author:
  nick: 京东
  github_name: JDC
date: ${date}
publishDate: ${publishDate}
link: ${link}
---`
}