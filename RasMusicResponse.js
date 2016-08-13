var http=require('http');

http.ServerResponse.prototype.respond = function (content, status) {
	if ('undifined' == typeof status) {
		
		if 'number' == typeof content) {
			status = parseInt(content);
			content = undifined;
		} else {
			status = 200;
		}
	} 

	if(status != 200) {
		content = {
			"code": status,
			"status": http.STATUS_CODES[status],
			"message": content && content.toString() || null
		};
	}

	if ('object' != typeof content) {
		content = { "result": content};
	}

	this.send(JSON.stringify(content) + "\n", status);

}