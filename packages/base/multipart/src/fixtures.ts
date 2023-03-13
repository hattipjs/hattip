const CHROME = [
	"------WebKitFormBoundary5q5HJuamu5JeQgMV",
	'Content-Disposition: form-data; name="field1"',
	"",
	"Smiley 😊",
	"------WebKitFormBoundary5q5HJuamu5JeQgMV",
	'Content-Disposition: form-data; name="field2"',
	"",
	"Iğdır",
	"------WebKitFormBoundary5q5HJuamu5JeQgMV",
	'Content-Disposition: form-data; name="files"; filename="Weirdly Named File 😊.txt"',
	"Content-Type: text/plain",
	"",
	"Some non-ASCII content 😊\n",
	"------WebKitFormBoundary5q5HJuamu5JeQgMV--",
	"",
].join("\r\n");

const FIREFOX = [
	"-----------------------------1258811295367515440181728109",
	'Content-Disposition: form-data; name="field1"',
	"",
	"Smiley 😊",
	"-----------------------------1258811295367515440181728109",
	'Content-Disposition: form-data; name="field2"',
	"",
	"Iğdır",
	"-----------------------------1258811295367515440181728109",
	'Content-Disposition: form-data; name="files"; filename="Weirdly Named File 😊.txt"',
	"Content-Type: text/plain",
	"",
	"Some non-ASCII content 😊\n",
	"-----------------------------1258811295367515440181728109--",
	"",
].join("\r\n");

export const examples = [
	{
		name: "Chrome",
		content: CHROME,
		boundary: "----WebKitFormBoundary5q5HJuamu5JeQgMV",
	},
	{
		name: "Firefox",
		content: FIREFOX,
		boundary: "---------------------------1258811295367515440181728109",
	},
];

export const bufferSizes = [1, 2, 5, 37, 38, 54, 55, 1024];
