function ajax(param){
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function(){
		if (xmlhttp.readyState == 4){
			if(xmlhttp.status == 200){
				param.success(xmlhttp.responseText);
			}else {
				if(param.error){
					param.error(xmlhttp.status);
				}else{
					if (xmlhttp.status == 0) {
						alert('Sem conexao. Verifique sua rede');
					} else if (xmlhttp.status == 404) {
						alert('Ocorreu um erro (404). Por favor contate o administrador.');
					} else if (xmlhttp.status == 500) {
						alert('Ocorreu um erro (500). Por favor contate o administrador.');
					}
				}
			}
		}
	}
	xmlhttp.open(param.type, param.url, param.async || true);
	xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");  
	xmlhttp.send(param.data);
}

const getResource = (url) => new Promise((resolve, reject) => ajax({
	type : "get",
	url : url,
	async : true,
	success : resolve,
	error : (status) => {
		if(403){
			reject('Resource ' + url + ' not found');
		}else{
			reject('Error ' + status + ' on resource ' + url);
		}
	}
}))

module.exports = {
	get: (url) => new Promise((resolve, reject) => ajax({
		type : "get",
		url : url,
		async : true,
		success : resolve,
		error : reject
	})),
	post: (url, param) => new Promise((resolve, reject) => ajax({
		type : "POST",
		url : url,
		data : param,
		async : true,
		dataType : "html",
		success : resolve,
		error: reject
	})),
	htmlPage: (url) => getResource(`${url}.js`),
	js: (url) => getResource(`${url}.js`)
}