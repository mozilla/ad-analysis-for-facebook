/**
 * @requires background/data-server.js
 **/
const [__server] = (function() {
	/**
	 * @constant {DataServer} Server to handle all message exchanges.
	 **/
	const dataServer = new DataServer();
	return [dataServer];
})();
